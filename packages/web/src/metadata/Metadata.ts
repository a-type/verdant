import {
	applyPatch,
	applyPatches,
	assert,
	assignOid,
	ClientMessage,
	diffToPatches,
	DocumentBaseline,
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
	private readonly log = (...args: any[]) => {};

	constructor(
		private readonly db: IDBDatabase,
		private readonly schemaDefinition: StorageSchema<any>,
		{ log }: { log?: (...args: any[]) => void } = {},
	) {
		super();
		if (log) this.log = log;
	}

	get now() {
		return this.time.now(this.schema.currentVersion);
	}

	/**
	 * Methods for accessing data
	 */

	createTransaction = (stores: ('operations' | 'baselines')[]) => {
		return this.db.transaction(stores, 'readwrite');
	};

	/**
	 * Recomputes an entire document from stored operations and baselines.
	 */
	getComputedDocument = async <T = any>(
		oid: ObjectIdentifier,
		upToTimestamp?: string,
	): Promise<T | undefined> => {
		return this.getRecursiveComputedEntity(oid, upToTimestamp);
	};

	getRecursiveComputedEntity = async <T = any>(
		entityOid: ObjectIdentifier,
		upToTimestamp?: string,
	): Promise<T | undefined> => {
		const documentOid = getOidRoot(entityOid);
		const transaction = this.db.transaction(
			['baselines', 'operations'],
			'readwrite',
		);
		const baselines = await this.baselines.getAllForDocument(documentOid, {
			transaction,
		});
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
				transaction,
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
	 * Gets the OID and every sub-object OID for a given document.
	 * Includes any sub-objects that are not referenced by the root object
	 * but still happen to be in storage.
	 */
	getAllDocumentRelatedOids = async (oid: ObjectIdentifier) => {
		const oids = new Set<ObjectIdentifier>();
		const documentOid = getOidRoot(oid);
		assert(documentOid === oid, 'Must be root document OID');
		oids.add(documentOid);
		// readwrite mode to block on other write transactions
		const transaction = this.db.transaction(
			['baselines', 'operations'],
			'readwrite',
		);
		await Promise.all([
			this.baselines.iterateOverAllForDocument(
				documentOid,
				(baseline) => {
					oids.add(baseline.oid);
				},
				{ transaction },
			),
			this.operations.iterateOverAllOperationsForDocument(
				documentOid,
				(patch) => {
					oids.add(patch.oid);
				},
				{ transaction },
			),
		]);

		return Array.from(oids);
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
		// await this.rebaseLock;
		this.log(`Inserting ${operations.length} local operations`);

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
		// await this.rebaseLock;
		this.log(`Inserting ${operations.length} remote operations`);

		const affectedDocumentOids = await this.operations.addOperations(
			operations.map((patch) => ({
				...patch,
				isLocal: false,
			})),
		);

		this.ack(operations[operations.length - 1].timestamp);

		return affectedDocumentOids;
	};

	insertRemoteBaselines = async (baselines: DocumentBaseline[]) => {
		if (baselines.length === 0) return [];
		// await this.rebaseLock;
		this.log(`Inserting ${baselines.length} remote baselines`);

		await this.baselines.setAll(baselines);

		this.ack(baselines[baselines.length - 1].timestamp);

		const affectedOidSet = new Set<ObjectIdentifier>();
		baselines.forEach((baseline) => {
			affectedOidSet.add(getOidRoot(baseline.oid));
		});

		return Array.from(affectedOidSet);
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
		let lastTimestamp;
		const toRebase = new Set<ObjectIdentifier>();
		const transaction = this.db.transaction(
			['baselines', 'operations'],
			'readwrite',
		);
		let operationCount = 0;
		await this.operations.iterateOverAllOperations(
			(patch) => {
				toRebase.add(patch.oid);
				lastTimestamp = patch.timestamp;
				operationCount++;
			},
			{
				before: globalAckTimestamp,
				transaction,
			},
		);

		if (!toRebase.size) {
			this.log('Cannot rebase, no operations prior to', globalAckTimestamp);
			return;
		}

		// rebase each affected document
		for (const oid of toRebase) {
			await this.rebase(oid, lastTimestamp || globalAckTimestamp, transaction);
		}
	};

	rebase = async (
		oid: ObjectIdentifier,
		upTo: string,
		providedTx?: IDBTransaction,
	) => {
		// including replica Id for testing I guess
		const replicaId = (await this.localReplica.get()).id;

		this.log('[', replicaId, ']', 'Rebasing', oid, 'up to', upTo);
		const transaction =
			providedTx ||
			this.db.transaction(['operations', 'baselines'], 'readwrite');
		const baseline = await this.baselines.get(oid, { transaction });
		let current: any = baseline?.snapshot || undefined;
		let operationsApplied = 0;
		await this.operations.iterateOverAllOperationsForEntity(
			oid,
			(patch, store) => {
				current = applyPatch(current, patch.data);
				operationsApplied++;
				store.delete(patch.oid_timestamp);
			},
			{
				to: upTo,
				transaction,
			},
		);
		if (current) {
			assignOid(current, oid);
		}
		await this.baselines.set(
			{
				oid,
				snapshot: current,
				timestamp: upTo,
			},
			{ transaction },
		);

		this.log(
			'successfully rebased',
			oid,
			'up to',
			upTo,
			':',
			current,
			'and deleted',
			operationsApplied,
			'operations',
		);
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
