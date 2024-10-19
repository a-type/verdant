import {
	applyPatch,
	assert,
	assignOid,
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	getOidRoot,
	ObjectIdentifier,
	Operation,
	substituteRefsWithObjects,
} from '@verdant-web/common';
import {
	AbstractTransaction,
	ClientOperation,
	CommonQueryOptions,
	MetadataExport,
	PersistenceMetadataDb,
} from './interfaces.js';
import { InitialContext } from '../context/context.js';
import { PersistenceRebaser } from './PersistenceRebaser.js';
import { MessageCreator } from './MessageCreator.js';
import { Disposable } from '../utils/Disposable.js';

export class PersistenceMetadata extends Disposable {
	private rebaser: PersistenceRebaser;
	/** Available to others, like sync... */
	readonly messageCreator: MessageCreator;
	readonly events = new EventSubscriber<{
		syncMessage: (message: ClientMessage) => void;
	}>();

	constructor(
		private db: PersistenceMetadataDb,
		private ctx: InitialContext,
	) {
		super();
		this.rebaser = new PersistenceRebaser(db, ctx);
		this.messageCreator = new MessageCreator(db, ctx);
		this.compose(this.db);
	}

	private insertOperations = async (
		operations: ClientOperation[],
		options?: { transaction?: AbstractTransaction },
	) => {
		this.ctx.log(
			'debug',
			`Inserting ${operations.length} operations`,
			operations,
		);

		const affectedDocumentOids = await this.db.addOperations(
			operations,
			options,
		);

		for (const op of operations) {
			this.ctx.globalEvents.emit('operation', op);
		}

		// we can now enqueue and check for rebase opportunities
		if (!this.ctx.config.persistence?.disableRebasing) {
			this.rebaser.tryAutonomousRebase();
		}

		return affectedDocumentOids;
	};

	private insertLocalOperations = async (
		operations: Operation[],
		options?: { transaction?: AbstractTransaction },
	) => {
		if (operations.length === 0) return;

		// add local flag, in place.
		for (const operation of operations) {
			(operation as ClientOperation).isLocal = true;
		}
		await this.insertOperations(operations as ClientOperation[], options);

		const message = await this.messageCreator.createOperation({ operations });
		this.events.emit('syncMessage', message);

		operations.forEach((o) => this.ctx.globalEvents.emit('operation', o));
	};

	private insertRemoteOperations = async (
		operations: Operation[],
		options?: { transaction?: AbstractTransaction },
	) => {
		if (operations.length === 0) return [];

		// add local flag, in place
		for (const operation of operations) {
			(operation as ClientOperation).isLocal = false;
		}

		await this.insertOperations(operations as ClientOperation[], options);

		this.ack(operations[operations.length - 1].timestamp);
	};

	private insertRemoteBaselines = async (
		baselines: DocumentBaseline[],
		options?: { transaction?: AbstractTransaction },
	) => {
		if (baselines.length === 0) return [];
		this.ctx.log('debug', `Inserting ${baselines.length} remote baselines`);

		await this.db.setBaselines(baselines, options);

		// this.ack(baselines[baselines.length - 1].timestamp);

		const affectedOidSet = new Set<ObjectIdentifier>();
		baselines.forEach((baseline) => {
			affectedOidSet.add(getOidRoot(baseline.oid));
		});

		return Array.from(affectedOidSet);
	};

	deleteDocument = async (rootOid: string) => {
		const oids = new Set<ObjectIdentifier>();
		const documentOid = getOidRoot(rootOid);
		assert(documentOid === rootOid, 'Must be root document OID');
		oids.add(documentOid);
		// readwrite mode to block on other write transactions
		const transaction = this.db.transaction({
			storeNames: ['baselines', 'operations'],
		});
		await Promise.all([
			this.db.iterateDocumentBaselines(
				documentOid,
				(baseline) => {
					oids.add(baseline.oid);
				},
				{ transaction },
			),
			this.db.iterateDocumentOperations(
				documentOid,
				(patch) => {
					oids.add(patch.oid);
				},
				{ transaction },
			),
		]);
		const authz = await this.getDocumentAuthz(documentOid);
		const ops = new Array<Operation>();
		for (const oid of oids) {
			ops.push({
				oid,
				timestamp: this.ctx.time.now,
				data: { op: 'delete' },
				authz,
			});
		}
		return this.insertLocalOperations(ops);
	};

	deleteCollection = async (collection: string) => {
		const oids = new Set<ObjectIdentifier>();
		const transaction = this.db.transaction({
			storeNames: ['baselines', 'operations'],
			mode: 'readwrite',
		});
		await Promise.all([
			this.db.iterateCollectionBaselines(
				collection,
				(baseline) => {
					oids.add(baseline.oid);
				},
				{ transaction },
			),
			this.db.iterateCollectionOperations(
				collection,
				(patch) => {
					oids.add(patch.oid);
				},
				{ transaction },
			),
		]);

		const ops = new Array<Operation>();
		for (const oid of oids) {
			ops.push({
				oid,
				timestamp: this.ctx.time.now,
				data: { op: 'delete' },
				authz: undefined,
			});
		}

		return this.insertLocalOperations(ops);
	};

	getDocumentSnapshot = async (
		oid: ObjectIdentifier,
		options: { to?: string } = {},
	) => {
		const documentOid = getOidRoot(oid);
		assert(documentOid === oid, 'Must be root document OID');
		const transaction = this.db.transaction({
			storeNames: ['baselines', 'operations'],
			mode: 'readwrite',
		});
		const baselines: DocumentBaseline[] = [];
		await this.db.iterateDocumentBaselines(
			documentOid,
			(b) => {
				baselines.push(b);
			},
			{
				transaction,
			},
		);
		const objectMap = new Map<ObjectIdentifier, any>();
		for (const baseline of baselines) {
			if (baseline.snapshot) {
				assignOid(baseline.snapshot, baseline.oid);
			}
			objectMap.set(baseline.oid, baseline.snapshot);
		}
		await this.db.iterateDocumentOperations(
			documentOid,
			(op) => {
				const obj = objectMap.get(op.oid) || undefined;
				const newObj = applyPatch(obj, op.data);
				if (newObj) {
					assignOid(newObj, op.oid);
				}
				objectMap.set(op.oid, newObj);
			},
			{
				transaction,
				// only apply operations up to the current time
				to: options.to || this.ctx.time.now,
			},
		);
		const root = objectMap.get(documentOid);
		if (root) {
			substituteRefsWithObjects(root, objectMap);
		}
		return root;
	};

	getDocumentData = async (
		oid: ObjectIdentifier,
		options?: { abort?: AbortSignal },
	) => {
		const transaction = this.db.transaction({
			storeNames: ['baselines', 'operations'],
			abort: options?.abort,
		});
		const baselines: DocumentBaseline[] = [];
		const operations: Record<ObjectIdentifier, Operation[]> = {};
		await Promise.all([
			this.db.iterateDocumentBaselines(
				oid,
				(baseline) => {
					baselines.push(baseline);
				},
				{
					transaction,
				},
			),
			this.db.iterateDocumentOperations(
				oid,
				(op) => {
					operations[op.oid] ??= [];
					operations[op.oid].push(op);
				},
				{ transaction },
			),
		]);
		return {
			baselines,
			operations,
		};
	};

	getDocumentAuthz = async (oid: ObjectIdentifier) => {
		let authz;
		await this.db.iterateEntityOperations(oid, (op) => {
			if (op.data.op === 'initialize') {
				authz = op.authz;
				return true;
			}
		});
		return authz;
	};

	insertData = async (
		data: {
			baselines?: DocumentBaseline[];
			operations?: Operation[];
			isLocal?: boolean;
		},
		options?: { abort?: AbortSignal },
	) => {
		const transaction = this.db.transaction({
			storeNames: ['baselines', 'operations'],
			abort: options?.abort,
			mode: 'readwrite',
		});
		if (data.baselines) {
			await this.insertRemoteBaselines(data.baselines, { transaction });
		}
		if (options?.abort?.aborted) return;
		if (data.operations) {
			if (data.isLocal) {
				await this.insertLocalOperations(data.operations, { transaction });
			} else {
				await this.insertRemoteOperations(data.operations, { transaction });
			}
		}
	};

	updateLastSynced = async (timestamp: string) => {
		if (this.ctx.closing) return;

		return this.db.updateLocalReplica({
			lastSyncedLogicalTime: timestamp,
		});
	};
	setGlobalAck = this.db.setGlobalAck;

	getLocalReplica = async (options?: CommonQueryOptions) => {
		return this.db.getLocalReplica(options);
	};

	// used to construct sync messages
	iterateLocalOperations = this.db.iterateLocalOperations;
	iterateAllOperations = this.db.iterateAllOperations;
	iterateAllBaselines = this.db.iterateAllBaselines;

	reset = this.db.reset;
	stats = this.db.stats;

	export = async (): Promise<MetadataExport> => {
		const db = this.db;
		const baselines = new Array<DocumentBaseline>();
		const operations = new Array<ClientOperation>();
		const transaction = db.transaction({
			storeNames: ['baselines', 'operations'],
			mode: 'readwrite',
		});
		await this.iterateAllOperations(
			(op) => {
				operations.push(op);
			},
			{ transaction },
		);
		await this.iterateAllBaselines(
			(baseline) => {
				baselines.push(baseline);
			},
			{ transaction },
		);
		const localReplica = await this.db.getLocalReplica();
		return {
			operations,
			baselines,
			localReplica,
			schemaVersion: this.ctx.schema.version,
		};
	};

	resetFrom = async (data: MetadataExport) => {
		const db = this.db;
		const transaction = db.transaction({
			storeNames: ['baselines', 'operations', 'info'],
			mode: 'readwrite',
		});
		await this.db.reset({ clearReplica: true, transaction });
		if (data.localReplica) {
			await this.db.updateLocalReplica(
				{
					ackedLogicalTime: data.localReplica.ackedLogicalTime,
					lastSyncedLogicalTime: data.localReplica.lastSyncedLogicalTime,
				},
				{ transaction },
			);
		}
		this.ctx.log('debug', 'Resetting metadata from export', data);
		await this.insertData({
			operations: data.operations,
			baselines: data.baselines,
			isLocal: true,
		});
	};

	manualRebase = async () => {
		if (this.ctx.closing || this.ctx.config.persistence?.disableRebasing)
			return;
		const ackInfo = await this.db.getAckInfo();
		if (ackInfo.globalAckTimestamp) {
			await this.rebaser.tryAutonomousRebase();
		}
	};

	private ack = async (timestamp: string) => {
		const localReplicaInfo = await this.db.getLocalReplica();
		// can't ack timestamps from the future.
		if (timestamp > this.ctx.time.now) return;

		this.events.emit('syncMessage', {
			type: 'ack',
			replicaId: localReplicaInfo.id,
			timestamp,
		});

		if (
			!this.ctx.closing &&
			(!localReplicaInfo.ackedLogicalTime ||
				timestamp > localReplicaInfo.ackedLogicalTime)
		) {
			this.db.updateLocalReplica({ ackedLogicalTime: timestamp });
		}
	};
}
