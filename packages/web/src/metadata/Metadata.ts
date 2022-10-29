import {
	applyPatch,
	applyPatches,
	assignOid,
	ClientMessage,
	diffToPatches,
	EventSubscriber,
	getOidRoot,
	groupPatchesByIdentifier,
	HybridLogicalClockTimestampProvider,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageSchema,
	substituteRefsWithObjects,
} from '@lo-fi/common';
import { AckInfoStore } from './AckInfoStore.js';
import { BaselinesStore } from './BaselinesStore.js';
import { getSizeOfObjectStore } from '../idb.js';
import { LocalReplicaStore } from './LocalReplicaStore.js';
import { MessageCreator } from './MessageCreator.js';
import { ClientOperation, OperationsStore } from './OperationsStore.js';
import { SchemaStore } from './SchemaStore.js';

export class Metadata extends EventSubscriber<{
	message: (message: ClientMessage) => void;
}> {
	readonly operations = new OperationsStore(this.db);
	readonly baselines = new BaselinesStore(this.db);
	readonly localReplica = new LocalReplicaStore(this.db);
	readonly ackInfo = new AckInfoStore(this.db);
	readonly schema = new SchemaStore(this.db, this.schemaDefinition.version);
	readonly messageCreator = new MessageCreator(this);
	readonly patchCreator = new PatchCreator(() => this.now);
	readonly time = new HybridLogicalClockTimestampProvider();

	constructor(
		private readonly db: IDBDatabase,
		private readonly schemaDefinition: StorageSchema<any>,
	) {
		super();
	}

	get now() {
		return this.time.now(this.schema.currentVersion);
	}

	/**
	 * Methods for accessing data
	 */

	/**
	 * Recomputes an entire document from stored operations and baselines.
	 */
	getComputedDocument = async <T = any>(
		oid: ObjectIdentifier,
		upToTimestamp?: string,
	): Promise<T | undefined> => {
		return this.getRecursiveComputedEntity(oid, upToTimestamp);
	};

	/**
	 * Recomputes a normalized view of a single entity object from stored operations
	 * and baseline.
	 */
	getComputedEntity = async <T = any>(
		oid: ObjectIdentifier,
		upToTimestamp?: string,
	): Promise<T | undefined> => {
		const baseline = await this.baselines.get(oid);
		let current: any = baseline?.snapshot || undefined;
		let operationsApplied = 0;
		await this.operations.iterateOverAllOperationsForEntity(
			oid,
			(patch) => {
				current = applyPatch(current, patch.data);
				operationsApplied++;
			},
			{
				to: upToTimestamp,
			},
		);
		if (current) {
			assignOid(current, oid);
		}
		return current as T | undefined;
	};

	getRecursiveComputedEntity = async <T = any>(
		entityOid: ObjectIdentifier,
		upToTimestamp?: string,
	): Promise<T | undefined> => {
		const documentOid = getOidRoot(entityOid);
		const baselines = await this.baselines.getAllForDocument(documentOid);
		const subObjectsMappedByOid = new Map<ObjectIdentifier, any>();
		for (const baseline of baselines) {
			subObjectsMappedByOid.set(baseline.oid, baseline.snapshot);
		}

		let lastPatchWasDelete = false;

		await this.operations.iterateOverAllOperationsForDocument(
			documentOid,
			(patch) => {
				let current = subObjectsMappedByOid.get(patch.oid);
				current = applyPatch(current, patch.data);
				subObjectsMappedByOid.set(patch.oid, current);
				lastPatchWasDelete = patch.data.op === 'delete';
				// TODO: user-configurable delete-wins or delete-loses behavior?
				// one way to do that would be to ignore delete ops until the end,
				// and only return nothing if the last op was a delete.
			},
			{
				to: upToTimestamp,
			},
		);

		// assemble the various sub-objects into the document by
		// placing them where their ref is
		const rootBaseline = subObjectsMappedByOid.get(entityOid);
		// critical: attach metadata
		if (rootBaseline) {
			assignOid(rootBaseline, entityOid);
			const usedOids = substituteRefsWithObjects(
				rootBaseline,
				subObjectsMappedByOid,
			);
		}

		// FIXME: this is a fragile check for deleted
		if (lastPatchWasDelete || !rootBaseline) {
			return undefined;
		}

		return rootBaseline as T;
	};

	/**
	 * Methods for writing data
	 */

	/**
	 * Acks that we have seen a timestamp to the server
	 * and stores it as our local ackedLogicalTime if it's
	 * greater than our current ackedLogicalTime.
	 */
	ack = async (timestamp: string) => {
		const localReplicaInfo = await this.localReplica.get();
		this.emit('message', {
			type: 'ack',
			replicaId: localReplicaInfo.id,
			timestamp,
		});
		if (
			!localReplicaInfo.ackedLogicalTime ||
			timestamp > localReplicaInfo.ackedLogicalTime
		) {
			this.localReplica.update({ ackedLogicalTime: timestamp });
		}
	};

	/**
	 * Applies a patch to the document and stores it in the database.
	 * @returns the oldest local history timestamp
	 */
	insertLocalOperation = async (operations: Operation[]) => {
		if (operations.length === 0) return;

		// add local flag, in place.
		for (const operation of operations) {
			(operation as ClientOperation).isLocal = true;
		}
		await this.operations.addOperations(operations as ClientOperation[]);

		// we can now enqueue and check for rebase opportunities
		this.tryAutonomousRebase();
	};

	/**
	 * Inserts remote operations. This does not affect local history.
	 * @returns a list of affected document OIDs
	 */
	insertRemoteOperations = async (operations: Operation[]) => {
		if (operations.length === 0) return [];

		const affectedOids = await this.operations.addOperations(
			operations.map((patch) => ({
				...patch,
				isLocal: false,
			})),
		);

		this.ack(operations[operations.length - 1].timestamp);

		return affectedOids;
	};

	updateLastSynced = async () => {
		return this.localReplica.update({
			lastSyncedLogicalTime: this.now,
		});
	};

	lastSyncedTimestamp = async () => {
		const localReplicaInfo = await this.localReplica.get();
		return localReplicaInfo.lastSyncedLogicalTime;
	};

	private tryAutonomousRebase = async () => {
		const localReplicaInfo = await this.localReplica.get();
		if (localReplicaInfo.lastSyncedLogicalTime) return; // cannot autonomously rebase if we've synced
		// but if we have never synced... we can rebase everything!
		await this.autonomousRebase(this.now);
	};

	/**
	 * Attempt to autonomously rebase local documents without server intervention.
	 * This can currently only happen for a client who has never synced before.
	 * The goal is to allow local-only clients to compress their history to exactly
	 * their undo stack.
	 */
	private autonomousRebase = async (globalAckTimestamp: string) => {
		// find all operations before the global ack
		const priorOperations = new Array<ClientOperation>();
		await this.operations.iterateOverAllLocalOperations(
			(patch) => {
				priorOperations.push(patch);
			},
			{
				before: globalAckTimestamp,
			},
		);

		if (!priorOperations.length) {
			return;
		}

		// gather all oids affected
		const toRebase = new Set<ObjectIdentifier>();
		for (const op of priorOperations) {
			toRebase.add(op.oid);
		}
		const lastOperation = priorOperations[priorOperations.length - 1];

		// rebase each affected document
		for (const oid of toRebase) {
			await this.rebase(oid, lastOperation.timestamp);
		}
	};

	rebase = async (oid: ObjectIdentifier, upTo: string) => {
		console.log('Rebasing', oid, 'up to', upTo);
		const view = await this.getComputedEntity(oid, upTo);
		await this.baselines.set({
			oid,
			snapshot: view,
			timestamp: upTo,
		});
		// separate iteration to ensure the above has completed before destructive
		// actions. TODO: use a transaction instead
		await this.operations.iterateOverAllOperationsForEntity(
			oid,
			(op, store) => {
				store.delete(op.oid_timestamp);
			},
			{
				to: upTo,
				mode: 'readwrite',
			},
		);

		console.log('successfully rebased', oid, 'up to', upTo, ':', view);
	};

	reset = async () => {
		await this.operations.reset();
		await this.baselines.reset();
		await this.localReplica.reset();
	};

	updateSchema = async (schema: StorageSchema) => {
		const storedSchema = await this.schema.get();
		if (storedSchema) {
			// version changes will be handled by migration routines in
			// the actual idb database loading code (see: initializeDatabases)

			// but this check determines if the schema has been changed without
			// a version change. if so, it will error.
			if (
				storedSchema.version === schema.version &&
				JSON.stringify(storedSchema) !== JSON.stringify(schema)
			) {
				console.error(
					`Schema mismatch for version ${schema.version}
					${JSON.stringify(storedSchema)}
					${JSON.stringify(schema)}`,
				);
				throw new Error(
					'Schema has changed without a version change! Any changes to your schema must be accompanied by a change in schema version and a migration routine.',
				);
			}
		}
		await this.schema.set(schema);
	};

	setGlobalAck = async (timestamp: string) => {
		await this.ackInfo.setGlobalAck(timestamp);
		await this.autonomousRebase(timestamp);
	};

	stats = async () => {
		const db = this.db;
		const operationsSize = await getSizeOfObjectStore(db, 'operations');
		const baselinesSize = await getSizeOfObjectStore(db, 'baselines');

		return {
			operationsSize,
			baselinesSize,
		};
	};
}
