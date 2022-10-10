import {
	applyPatch,
	assignOid,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageSchema,
	substituteRefsWithObjects,
} from '@lofi/common';
import { AckInfoStore } from './AckInfoStore.js';
import { BaselinesStore } from './BaselinesStore.js';
import { getSizeOfObjectStore } from './idb.js';
import { LocalHistoryStore } from './LocalHistoryStore.js';
import { LocalReplicaStore } from './LocalReplicaStore.js';
import { MessageCreator } from './MessageCreator.js';
import { ClientOperation, OperationsStore } from './OperationsStore.js';
import { SchemaStore } from './SchemaStore.js';
import type { Sync } from './Sync.js';

export class Metadata {
	readonly operations = new OperationsStore(this.db);
	readonly baselines = new BaselinesStore(this.db);
	readonly localReplica = new LocalReplicaStore(this.db);
	readonly ackInfo = new AckInfoStore(this.db);
	readonly schema = new SchemaStore(this.db, this.schemaDefinition.version);
	readonly localHistory = new LocalHistoryStore(this.db);
	readonly messageCreator = new MessageCreator(this);
	readonly patchCreator = new PatchCreator(() => this.now);

	constructor(
		private readonly db: IDBDatabase,
		readonly sync: Sync,
		private readonly schemaDefinition: StorageSchema<any>,
	) {}

	get now() {
		return this.sync.time.now(this.schema.currentVersion);
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
		const baselines = await this.baselines.getAllForDocument(oid);
		const subObjectsMappedByOid = new Map<ObjectIdentifier, any>();
		for (const baseline of baselines) {
			subObjectsMappedByOid.set(baseline.oid, baseline.snapshot);
		}

		let lastPatchWasDelete = false;

		await this.operations.iterateOverAllOperationsForDocument(
			oid,
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
		const rootBaseline = subObjectsMappedByOid.get(oid);
		// critical: attach metadata
		if (rootBaseline) {
			assignOid(rootBaseline, oid);
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
		return current as T | undefined;
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
		this.sync.send({
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

		const localReplicaInfo = await this.localReplica.get();
		await this.operations.addOperations(
			operations.map((patch) => ({
				...patch,
				isLocal: true,
			})),
		);

		const oldestHistoryTimestamp = await this.localHistory.add({
			timestamp: operations[operations.length - 1].timestamp,
		});

		this.tryAutonomousRebase(oldestHistoryTimestamp);

		return oldestHistoryTimestamp;
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

	/**
	 * Determines if the local client can do independent rebases.
	 * This is only the case if the client has never synced
	 * with a server (entirely offline mode)
	 *
	 * TODO:
	 * This might be able to be expanded in the future, I feel
	 * like there's some combination of "history is all my changes"
	 * plus global ack which could allow squashing operations for
	 * single objects.
	 */
	private async canAutonomouslyRebase() {
		return !(await this.localReplica.get()).lastSyncedLogicalTime;
	}

	/**
	 * Attempt to autonomously rebase local documents without server intervention.
	 * This can currently only happen for a client who has never synced before.
	 * The goal is to allow local-only clients to compress their history to exactly
	 * their undo stack.
	 */
	private tryAutonomousRebase = async (oldestHistoryTimestamp: string) => {
		if (!(await this.canAutonomouslyRebase())) {
			return;
		}

		const localInfo = await this.localReplica.get();

		// find all operations before the oldest history timestamp
		const priorOperations = new Array<ClientOperation>();
		await this.operations.iterateOverAllLocalOperations(
			(patch) => {
				priorOperations.push(patch);
			},
			{
				before: oldestHistoryTimestamp,
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
		await this.localHistory.reset();
		await this.localReplica.reset();
	};

	stats = async () => {
		const db = this.db;
		const history = await this.localHistory.get();
		const operationsSize = await getSizeOfObjectStore(db, 'operations');
		const baselinesSize = await getSizeOfObjectStore(db, 'baselines');

		return {
			localHistoryLength: history?.items.length || 0,
			operationsSize,
			baselinesSize,
		};
	};
}

export function openMetadataDatabase(indexedDB: IDBFactory = window.indexedDB) {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open('meta', 1);
		request.onupgradeneeded = (event) => {
			const db = request.result;
			// version 1: operations list, baselines, and local info
			if (!event.oldVersion) {
				const baselinesStore = db.createObjectStore('baselines', {
					keyPath: 'oid',
				});
				const operationsStore = db.createObjectStore('operations', {
					keyPath: 'oid_timestamp',
				});
				const infoStore = db.createObjectStore('info', { keyPath: 'type' });
				baselinesStore.createIndex('timestamp', 'timestamp');
				operationsStore.createIndex('isLocal_timestamp', 'isLocal_timestamp');
				operationsStore.createIndex(
					'documentOid_timestamp',
					'documentOid_timestamp',
				);
			}
		};
		request.onerror = () => {
			console.error('Error opening database', request.error);
			reject(request.error);
		};
		request.onsuccess = () => {
			resolve(request.result);
		};
	});
}
