import {
	AbstractTransaction,
	AckInfo,
	ClientOperation,
	CommonQueryOptions,
	Iterator,
	LocalReplicaInfo,
	PersistenceMetadataDb,
	DocumentBaseline,
	ObjectIdentifier,
} from '@verdant-web/store';
import { createOid, decomposeOid } from '@verdant-web/store/internal';
import { SqliteService } from '../SqliteService.js';
import { StoredBaseline, StoredOperation, Transaction } from '../kysely.js';
import { sql } from 'kysely';

export class SqlitePersistenceMetadataDb
	extends SqliteService
	implements PersistenceMetadataDb<Transaction>
{
	dispose = async (): Promise<void> => {
		await this.db.destroy();
	};
	getAckInfo = async (): Promise<AckInfo> => {
		return (
			(await this.db
				.selectFrom('__verdant__ackInfo')
				.select('globalAckTimestamp')
				.executeTakeFirst()) || { globalAckTimestamp: null }
		);
	};
	setGlobalAck = async (ack: string): Promise<void> => {
		await this.db
			.insertInto('__verdant__ackInfo')
			.values({ id: 'global', globalAckTimestamp: ack })
			.onConflict((c) =>
				c.column('id').doUpdateSet({ globalAckTimestamp: ack }),
			)
			.execute();
	};

	getLocalReplica = async (
		opts?: CommonQueryOptions<Transaction>,
	): Promise<LocalReplicaInfo | undefined> => {
		return (opts?.transaction ?? this.db)
			.selectFrom('__verdant__replicaInfo')
			.select(['id', 'userId', 'ackedLogicalTime', 'lastSyncedLogicalTime'])
			.where('unused_pk', '=', 'local_replica')
			.limit(1)
			.executeTakeFirst();
	};
	updateLocalReplica = async (
		data: LocalReplicaInfo,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		await (opts?.transaction ?? this.db)
			.insertInto('__verdant__replicaInfo')
			.values({
				unused_pk: 'local_replica',
				...data,
			})
			.onConflict((c) => c.column('unused_pk').doUpdateSet(data))
			.returningAll()
			// no need for where; there is only one entry.
			.executeTakeFirst();
	};

	/**
	 * MUTATES baseline. This is fine for baselines coming
	 * from the db.
	 */
	private hydrateBaseline = (
		baseline: Pick<StoredBaseline, 'oid' | 'snapshot' | 'timestamp'>,
	) => {
		baseline.snapshot = JSON.parse(baseline.snapshot);
		return baseline as DocumentBaseline;
	};

	iterateDocumentBaselines = async (
		rootOid: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		const baselines = await (opts?.transaction ?? this.db)
			.selectFrom('__verdant__baselines')
			.select(baselineColumns)
			.where('documentOid', '=', rootOid)
			.execute();
		baselines.forEach((b) => iterator(this.hydrateBaseline(b)));
	};
	iterateCollectionBaselines = async (
		collection: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		const baselines = await (opts?.transaction ?? this.db)
			.selectFrom('__verdant__baselines')
			.select(baselineColumns)
			.where('collection', '=', collection)
			.execute();
		baselines.forEach((b) => iterator(this.hydrateBaseline(b)));
	};
	iterateAllBaselines = async (
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		const baselines = await (opts?.transaction ?? this.db)
			.selectFrom('__verdant__baselines')
			.select(baselineColumns)
			.execute();
		baselines.forEach((b) => iterator(this.hydrateBaseline(b)));
	};
	getBaseline = async (
		oid: string,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<DocumentBaseline | null> => {
		const value =
			(await (opts?.transaction ?? this.db)
				.selectFrom('__verdant__baselines')
				.select(baselineColumns)
				.where('oid', '=', oid)
				.executeTakeFirst()) || null;
		if (value) return this.hydrateBaseline(value);
		return value;
	};
	setBaselines = async (
		baselines: DocumentBaseline[],
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		await (opts?.transaction ?? this.db)
			.insertInto('__verdant__baselines')
			.values(
				baselines.map((b) => {
					const { collection, id } = decomposeOid(b.oid);
					return {
						...b,
						snapshot: JSON.stringify(b.snapshot),
						documentOid: createOid(collection, id),
						collection,
					};
				}),
			)
			.onConflict((c) =>
				c.column('oid').doUpdateSet({
					snapshot: sql`excluded.snapshot`,
					timestamp: sql`excluded.timestamp`,
				}),
			)
			.execute();
	};
	deleteBaseline = async (
		oid: string,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		await (opts?.transaction ?? this.db)
			.deleteFrom('__verdant__baselines')
			.where('oid', '=', oid)
			.execute();
	};

	private hydrateOperation = (
		op: Pick<StoredOperation, 'oid' | 'timestamp' | 'data' | 'isLocal'>,
	): ClientOperation => {
		op.data = JSON.parse(op.data);
		return op as unknown as ClientOperation;
	};

	iterateDocumentOperations = async (
		rootOid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction> & { to?: string | null },
	): Promise<void> => {
		const { to } = opts ?? {};
		let query = (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns)
			.where('documentOid', '=', rootOid);
		if (to) {
			query = query.where('timestamp', '<', to);
		}
		const operations = await query.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
	};
	iterateEntityOperations = async (
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction> & { to?: string | null },
	): Promise<void> => {
		const { to } = opts ?? {};
		let query = (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns)
			.where('oid', '=', oid);
		if (to) {
			query = query.where('timestamp', '<=', to);
		}
		const operations = await query.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
	};
	iterateCollectionOperations = async (
		collection: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction>,
	): Promise<void> => {
		const operations = await (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns)
			.where('collection', '=', collection)
			.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
	};
	iterateLocalOperations = async (
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction> & {
			before?: string | null;
			after?: string | null;
		},
	): Promise<void> => {
		const { before, after } = opts ?? {};
		let query = (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns)
			.where('isLocal', '=', 1);
		if (before) {
			query = query.where('timestamp', '<', before);
		}
		if (after) {
			query = query.where('timestamp', '>', after);
		}
		const operations = await query.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
	};
	consumeEntityOperations = async (
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction> & { to?: string | null },
	): Promise<void> => {
		const { to } = opts ?? {};
		let query = (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns)
			.where('oid', '=', oid);
		if (to) {
			query = query.where('timestamp', '<=', to);
		}
		const operations = await query.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
		// delete only the operations that were consumed
		await (opts?.transaction ?? this.db)
			.deleteFrom('__verdant__operations')
			.where(
				'timestamp',
				'in',
				operations.map((o) => o.timestamp),
			)
			.execute();
	};
	iterateAllOperations = async (
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Transaction> & {
			before?: string | null;
			from?: string | null;
		},
	): Promise<void> => {
		const { before, from } = opts ?? {};
		let query = (opts?.transaction ?? this.db)
			.selectFrom('__verdant__operations')
			.select(operationColumns);
		if (before) {
			query = query.where('timestamp', '<', before);
		}
		if (from) {
			query = query.where('timestamp', '>=', from);
		}
		const operations = await query.execute();
		operations.forEach((o) => iterator(this.hydrateOperation(o)));
	};
	addOperations = async (
		ops: ClientOperation[],
		opts?: CommonQueryOptions<Transaction>,
	): Promise<ObjectIdentifier[]> => {
		const oids = new Set<ObjectIdentifier>();
		await (opts?.transaction ?? this.db)
			.insertInto('__verdant__operations')
			.values(
				ops.map((o) => {
					const { collection, id } = decomposeOid(o.oid);
					const oid = createOid(collection, id);
					oids.add(oid);
					return {
						...o,
						data: JSON.stringify(o.data),
						documentOid: oid,
						collection,
						isLocal: o.isLocal ? 1 : 0,
					};
				}),
			)
			// theoretically we could write the same op twice,
			// but it should never have changed.
			.onConflict((c) => c.columns(['oid', 'timestamp']).doNothing())
			.execute();
		return Array.from(oids);
	};
	reset = async (opts?: {
		clearReplica?: boolean;
		transaction?: AbstractTransaction;
	}): Promise<void> => {
		const { clearReplica } = opts ?? {};
		const transaction = opts?.transaction ?? this.db;
		await transaction.deleteFrom('__verdant__operations').execute();
		await transaction.deleteFrom('__verdant__baselines').execute();
		if (clearReplica) {
			await transaction.deleteFrom('__verdant__replicaInfo').execute();
		}
	};
	stats = async (): Promise<{
		operationsSize: { count: number; size: number };
		baselinesSize: { count: number; size: number };
	}> => {
		const [operationsSize, baselinesSize] = await Promise.all([
			this.tableStats('__verdant__operations'),
			this.tableStats('__verdant__baselines'),
		]);
		return {
			operationsSize: {
				count: operationsSize?.count ?? 0,
				size: 0, // not supported
			},
			baselinesSize: {
				count: baselinesSize?.count ?? 0,
				size: 0, // not supported
			},
		};
	};
}

const baselineColumns = ['oid', 'snapshot', 'timestamp', 'authz'] as const;
const operationColumns = [
	'data',
	'timestamp',
	'oid',
	'isLocal',
	'authz',
] as const;
