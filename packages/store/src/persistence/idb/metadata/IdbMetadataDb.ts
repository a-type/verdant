import {
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	DocumentBaseline,
	getLegacyDotOidSubIdRange,
	getOidRoot,
	getOidSubIdRange,
	ObjectIdentifier,
} from '@verdant-web/common';
import {
	AbstractTransaction,
	AckInfo,
	ClientOperation,
	CommonQueryOptions,
	Iterator,
	LocalReplicaInfo,
	PersistenceMetadataDb,
} from '../../interfaces.js';
import { IdbService } from '../IdbService.js';
import { closeDatabase, getSizeOfObjectStore } from '../util.js';
import { Context } from '../../../context/context.js';

export type StoredClientOperation = ClientOperation & {
	/** This acts as the primary key */
	oid_timestamp: string;
	l_t: string;
	d_t: string;
};

export type StoredSchema = {
	type: 'schema';
	schema: string;
};

export class IdbMetadataDb
	extends IdbService
	implements PersistenceMetadataDb<IDBTransaction>
{
	constructor(
		db: IDBDatabase,
		private ctx: Pick<Context, 'log' | 'namespace'>,
	) {
		super(db, ctx);
		this.addDispose(() => {
			this.ctx.log('info', `Closing metadata DB for`, this.ctx.namespace);
			return closeDatabase(db);
		});
	}

	transaction = async <T>(
		opts: {
			mode?: 'readwrite' | 'readonly';
			storeNames: string[];
			abort?: AbortSignal;
		},
		procedure: (tx: IDBTransaction) => Promise<T>,
	) => {
		const tx = this.createTransaction(opts.storeNames, {
			mode: opts.mode,
			abort: opts.abort,
		});
		const result = await procedure(tx);
		return result;
	};

	getAckInfo = async (): Promise<AckInfo> => {
		const result = await this.run<AckInfo>('info', (store) => store.get('ack'));
		if (result) {
			return result;
		} else {
			return {
				globalAckTimestamp: null,
			};
		}
	};

	setGlobalAck = async (ack: string): Promise<void> => {
		await this.run(
			'info',
			(store) => store.put({ type: 'ack', globalAckTimestamp: ack }),
			{ mode: 'readwrite' },
		);
	};

	getLocalReplica = async (
		opts?: CommonQueryOptions,
	): Promise<LocalReplicaInfo | undefined> => {
		return this.run<LocalReplicaInfo | undefined>(
			'info',
			(store) => store.get('localReplicaInfo'),
			opts,
		);
	};

	updateLocalReplica = async (
		data: LocalReplicaInfo,
		opts?: CommonQueryOptions,
	): Promise<void> => {
		try {
			await this.run(
				'info',
				(store) =>
					store.put({
						...data,
						type: 'localReplicaInfo',
					}),
				{
					mode: 'readwrite',
					transaction: opts?.transaction,
				},
			);
		} catch (e) {
			this.ctx.log('critical', 'Error updating local replica', data, e);
			throw e;
		}
	};

	iterateDocumentBaselines = async (
		rootOid: string,
		iterator: (baseline: DocumentBaseline) => void,
		opts?: CommonQueryOptions,
	): Promise<void> => {
		await this.iterate(
			'baselines',
			(store) => {
				const root = getOidRoot(rootOid);
				const [start, end] = getOidSubIdRange(rootOid);
				// FIXME: get rid of legacy dot OIDs...
				const [dotStart, dotEnd] = getLegacyDotOidSubIdRange(rootOid);
				return [
					store.openCursor(IDBKeyRange.only(root)),
					store.openCursor(IDBKeyRange.bound(start, end, false, false)),
					store.openCursor(IDBKeyRange.bound(dotStart, dotEnd, false, false)),
				];
			},
			iterator,
			opts,
		);
	};

	iterateCollectionBaselines = async (
		collection: string,
		iterator: (baseline: DocumentBaseline) => void,
		opts?: CommonQueryOptions,
	): Promise<void> => {
		await this.iterate(
			'baselines',
			(store) => {
				return [
					store.openCursor(
						IDBKeyRange.bound(collection, collection + '\uffff', false, false),
					),
				];
			},
			iterator,
			opts,
		);
	};

	iterateAllBaselines = async (
		iterator: Iterator<DocumentBaseline>,
		opts: CommonQueryOptions,
	): Promise<void> => {
		await this.iterate(
			'baselines',
			(store) => store.index('timestamp').openCursor(),
			iterator,
			opts,
		);
	};

	getBaseline = (
		oid: string,
		opts?: CommonQueryOptions,
	): Promise<DocumentBaseline> => {
		return this.run<DocumentBaseline>(
			'baselines',
			(store) => store.get(oid),
			opts,
		);
	};

	setBaselines = async (
		baselines: DocumentBaseline[],
		opts: CommonQueryOptions = writeOpts,
	): Promise<void> => {
		await this.runAll<any>(
			'baselines',
			(store) => baselines.map((b) => store.put(b)),
			opts,
		);
	};

	deleteBaseline = async (
		oid: string,
		opts: CommonQueryOptions = writeOpts,
	): Promise<void> => {
		await this.run('baselines', (store) => store.delete(oid), opts);
	};

	iterateDocumentOperations = (
		rootOid: string,
		iterator: (op: StoredClientOperation) => void,
		opts?: CommonQueryOptions & { to?: string | null },
	): Promise<void> => {
		return this.iterate<StoredClientOperation>(
			'operations',
			(store) => {
				const index = store.index('d_t');
				const start = createLowerBoundIndexValue(rootOid);
				const end = opts?.to
					? createCompoundIndexValue(rootOid, opts.to)
					: createUpperBoundIndexValue(rootOid);

				const range = IDBKeyRange.bound(start, end, false, false);
				return index.openCursor(range);
			},
			iterator,
			opts,
		);
	};

	iterateEntityOperations = (
		oid: string,
		iterator: (op: StoredClientOperation) => void,
		opts?: CommonQueryOptions & { to?: string | null },
	): Promise<void> => {
		// NOTE: this is simplified from original impl.
		// perhaps I missed some nuance as to why it was
		// so complex before?

		return this.iterate<StoredClientOperation>(
			'operations',
			(store) => {
				const start = createLowerBoundIndexValue(oid);
				const end = opts?.to
					? createCompoundIndexValue(oid, opts.to)
					: createUpperBoundIndexValue(oid);

				const range = IDBKeyRange.bound(start, end, false, false);
				return store.openCursor(range);
			},
			iterator,
			opts,
		);
	};

	consumeEntityOperations = (
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts: CommonQueryOptions & { to?: string | null } = writeOpts,
	): Promise<void> => {
		return this.iterate<StoredClientOperation>(
			'operations',
			(store) => {
				const start = createLowerBoundIndexValue(oid);
				const end = opts?.to
					? createCompoundIndexValue(oid, opts.to)
					: createUpperBoundIndexValue(oid);

				const range = IDBKeyRange.bound(start, end, false, false);
				return store.openCursor(range);
			},
			(op, store) => {
				iterator(op);
				store.delete(op.oid_timestamp);
			},
			opts,
		);
	};

	iterateCollectionOperations = (
		collection: string,
		iterator: (op: StoredClientOperation) => void,
		opts?: CommonQueryOptions,
	): Promise<void> => {
		return this.iterate(
			'operations',
			(store) => {
				return store.openCursor(
					IDBKeyRange.bound(collection, collection + '\uffff', false, false),
					'next',
				);
			},
			iterator,
			opts,
		);
	};

	iterateLocalOperations = (
		iterator: (op: StoredClientOperation) => void,
		opts?: CommonQueryOptions & {
			after?: string | null;
		},
	): Promise<void> => {
		return this.iterate(
			'operations',
			(store) => {
				const start = opts?.after
					? createCompoundIndexValue(true, opts.after)
					: createLowerBoundIndexValue(true);
				const end = createUpperBoundIndexValue(true);
				const index = store.index('l_t');
				return index.openCursor(
					// NOTE: differs from original impl -- last arg is 'false' instead of 'true'
					IDBKeyRange.bound(start, end, !!opts?.after, false),
					'next',
				);
			},
			iterator,
		);
	};

	iterateAllOperations = (
		iterator: (op: StoredClientOperation) => void,
		opts?: CommonQueryOptions & {
			before?: string | null;
			from?: string | null;
		},
	): Promise<void> => {
		return this.iterate(
			'operations',
			(store) => {
				const start = opts?.from
					? createLowerBoundIndexValue(opts.from)
					: undefined;
				const end = opts?.before
					? createUpperBoundIndexValue(opts.before)
					: createLowerBoundIndexValue(true);
				const range =
					start && end
						? IDBKeyRange.bound(start, end, false, true)
						: start
						? IDBKeyRange.lowerBound(start, false)
						: end
						? IDBKeyRange.upperBound(end, true)
						: undefined;
				return store.index('timestamp').openCursor(range, 'next');
			},
			iterator,
			opts,
		);
	};

	addOperations = async (
		ops: StoredClientOperation[],
		opts: CommonQueryOptions = writeOpts,
	): Promise<ObjectIdentifier[]> => {
		let affected = new Set<ObjectIdentifier>();
		await this.runAll(
			'operations',
			(store) =>
				ops.map((op) => {
					affected.add(getOidRoot(op.oid));
					return store.put(this.addOperationIndexes(op));
				}),
			opts,
		);
		return Array.from(affected);
	};

	reset = async ({
		clearReplica,
		transaction,
	}: {
		clearReplica?: boolean;
		transaction?: AbstractTransaction;
	} = {}): Promise<void> => {
		const tx =
			(transaction as IDBTransaction) ||
			this.createTransaction(['info', 'operations', 'baselines'], {
				mode: 'readwrite',
			});
		await Promise.all([
			this.resetLocalReplica(tx, clearReplica),
			this.resetBaselines(tx),
			this.resetOperations(tx),
		]);
	};

	stats = async (): Promise<{
		operationsSize: { count: number; size: number };
		baselinesSize: { count: number; size: number };
	}> => {
		const ops = await getSizeOfObjectStore(this.db, 'operations');
		const baselines = await getSizeOfObjectStore(this.db, 'baselines');
		return { operationsSize: ops, baselinesSize: baselines };
	};

	private resetLocalReplica = async (tx: IDBTransaction, clear = false) => {
		if (clear) {
			return this.run('info', (store) => store.delete('localReplicaInfo'), {
				mode: 'readwrite',
				transaction: tx,
			});
		} else {
			const localInfo = await this.getLocalReplica({
				transaction: tx,
			});
			if (localInfo) {
				localInfo.ackedLogicalTime = null;
				localInfo.lastSyncedLogicalTime = null;
				await this.run(
					'info',
					(store) =>
						store.put({
							...localInfo,
							type: 'localReplicaInfo',
						}),
					{
						mode: 'readwrite',
						transaction: tx,
					},
				);
			}
		}
	};

	private resetBaselines = async (tx: IDBTransaction) => {
		return this.clear('baselines', tx);
	};

	private resetOperations = async (tx: IDBTransaction) => {
		return this.clear('operations', tx);
	};

	private addOperationIndexes = (
		op: ClientOperation,
	): StoredClientOperation => {
		return {
			...op,
			oid_timestamp: createCompoundIndexValue(op.oid, op.timestamp) as string,
			l_t: createCompoundIndexValue(op.isLocal, op.timestamp) as string,
			d_t: createCompoundIndexValue(getOidRoot(op.oid), op.timestamp) as string,
		};
	};
}

const writeOpts = { mode: 'readwrite' } as const;
