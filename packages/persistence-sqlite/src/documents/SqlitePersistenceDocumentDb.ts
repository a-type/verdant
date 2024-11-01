import {
	PersistenceDocumentDb,
	CollectionFilter,
	ObjectIdentifier,
} from '@verdant-web/store';
import { SqliteService } from '../SqliteService.js';
import {
	collectionMultiValueIndexTableName,
	collectionTableName,
	Database,
	Transaction,
} from '../kysely.js';
import {
	Context,
	isRangeIndexFilter,
	isCompoundIndexFilter,
	isMatchIndexFilter,
	isStartsWithIndexFilter,
	CollectionCompoundIndexFilter,
	assert,
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	decomposeOid,
	getIndexValues,
	isMultiValueIndex,
} from '@verdant-web/store/internal';
import { SelectQueryBuilder } from 'kysely';

export class SqlitePersistenceDocumentDb
	extends SqliteService
	implements PersistenceDocumentDb
{
	constructor(db: Database, private ctx: Pick<Context, 'log' | 'schema'>) {
		super(db);
	}
	findOneOid = async (opts: {
		collection: string;
		index?: CollectionFilter;
	}): Promise<ObjectIdentifier | null> => {
		const result = await this.queryBase(opts.collection, opts.index)
			.limit(1)
			.executeTakeFirst();
		return result?.oid ?? null;
	};
	findAllOids = async (opts: {
		collection: string;
		index?: CollectionFilter;
		limit?: number;
		offset?: number;
	}): Promise<{ result: ObjectIdentifier[]; hasNextPage: boolean }> => {
		let query = this.queryBase(opts.collection, opts.index);
		if (opts.limit) {
			// limit + 1 tells us if there's a next page
			query = query.limit(opts.limit + 1);
		}
		if (opts.offset) {
			query = query.offset(opts.offset);
		}
		let result = await query.execute();
		if (opts.limit) {
			// cut down to limit
			result = result.slice(0, opts.limit);
		}
		return {
			result: result.map((r) => r.oid),
			hasNextPage: opts.limit ? result.length === opts.limit + 1 : false,
		};
	};

	private queryBase = (collection: string, index?: CollectionFilter) => {
		const key = index?.where;
		let query: SelectQueryBuilder<any, any, any>;
		let whereKey: string;
		const schema = this.ctx.schema.collections[collection];
		if (key && isMultiValueIndex(schema, key)) {
			query = this.db
				.selectFrom(collectionMultiValueIndexTableName(collection, key))
				.select('oid');
			whereKey = 'value';
		} else {
			query = this.db.selectFrom(collectionTableName(collection)).select('oid');
			whereKey = key ?? '';
		}

		if (!index) {
			return query.orderBy('oid');
		}

		if (isRangeIndexFilter(index)) {
			if (index.gt) {
				query = query.where(whereKey, '>', index.gt);
			} else if (index.gte) {
				query = query.where(whereKey, '>=', index.gte);
			}
			if (index.lt) {
				query = query.where(whereKey, '<', index.lt);
			}
			if (index.lte) {
				query = query.where(whereKey, '<=', index.lte);
			}
		} else if (isMatchIndexFilter(index)) {
			query = query.where(whereKey, '=', index.equals);
		} else if (isStartsWithIndexFilter(index)) {
			query = query.where(whereKey, 'like', `${index.startsWith}%`);
		} else if (isCompoundIndexFilter(index)) {
			const values = this.getCompoundIndexValues(collection, index);
			if (Array.isArray(values)) {
				query = query
					.where(whereKey, '>=', values[0])
					.where(whereKey, '<=', values[1]);
			} else {
				query = query.where(whereKey, '=', values);
			}
		}

		return query.orderBy(whereKey, index.order);
	};

	private getCompoundIndexValues = (
		collection: string,
		index: CollectionCompoundIndexFilter,
	) => {
		const indexDefinition =
			this.ctx.schema.collections[collection]?.compounds?.[index.where];
		assert(
			indexDefinition,
			`Index ${index.where} does not exist on collection ${collection}`,
		);
		const matchedKeys = Object.keys(index.match).sort(
			(a, b) => indexDefinition.of.indexOf(a) - indexDefinition.of.indexOf(b),
		);
		for (const key of matchedKeys) {
			if (indexDefinition.of.indexOf(key) !== matchedKeys.indexOf(key)) {
				throw new Error(
					`Compound index ${index.where} does not have ${key} at the start of its order`,
				);
			}
		}

		const matchedValues = matchedKeys.map(
			(key) => index.match[key as keyof typeof index.match] as string | number,
		);

		if (matchedKeys.length === indexDefinition.of.length) {
			return createCompoundIndexValue(...matchedValues);
		}

		return [
			createLowerBoundIndexValue(...matchedValues),
			createUpperBoundIndexValue(...matchedValues),
		];
	};

	saveEntities = async (
		entities: { oid: ObjectIdentifier; getSnapshot: () => any }[],
		optsAndInfo: { abort?: AbortSignal; collections: string[] },
	): Promise<void> => {
		await this.db.transaction().execute(async (tx) => {
			this.ctx.log('debug', `Saving ${entities.length} documents`);
			if (optsAndInfo.abort?.aborted) {
				throw new Error(`Entity save transaction aborted`);
			}
			for (const ent of entities) {
				try {
					await this.saveEntity(ent, tx);
				} catch (err) {
					this.ctx.log(
						'error',
						`Error saving document ${ent.oid} (${JSON.stringify(
							ent.getSnapshot(),
						)})`,
						err,
					);
					if (err instanceof Error) {
						throw err;
					} else {
						throw new Error('Unknown error saving document');
					}
				}
			}
		});
	};

	private saveEntity = async (
		ent: {
			oid: ObjectIdentifier;
			getSnapshot: () => any;
		},
		tx: Transaction,
	) => {
		this.ctx.log('debug', `Saving document indexes for querying ${ent.oid}`);
		const { collection, id } = decomposeOid(ent.oid);
		const snapshot = ent.getSnapshot();
		if (!snapshot) {
			// cascade will handle multi-value rows
			await tx
				.deleteFrom(collectionTableName(collection))
				.where('oid', '=', ent.oid)
				.execute();
			this.ctx.log('debug', `Deleted document indexes for querying ${ent.oid}`);
			return;
		} else {
			// lookup the collection schema, we need to know if there are
			// any multi-value indexes
			const schema = this.ctx.schema.collections[collection];
			const indexValues = getIndexValues(schema, snapshot);
			const singleValues: Record<string, any> = {};
			const multiValues: Array<{ key: string; value: any }> = [];
			for (const [key, value] of Object.entries(indexValues)) {
				if (isMultiValueIndex(schema, key)) {
					multiValues.push({ key, value });
				} else {
					singleValues[key] = value;
				}
			}
			await tx
				.insertInto(collectionTableName(collection))
				.values({ oid: ent.oid, ...singleValues })
				.onConflict((c) => c.column('oid').doUpdateSet(singleValues))
				.execute();
			for (const { key, value } of multiValues) {
				// clean old values... unfortunate, but necessary...
				await tx
					.deleteFrom(collectionMultiValueIndexTableName(collection, key))
					.where('oid', '=', ent.oid)
					.execute();
				if (Array.isArray(value)) {
					for (const val of value) {
						this.checkBindableValue(val, `multi-value index ${key}`);
						await tx
							.insertInto(collectionMultiValueIndexTableName(collection, key))
							.values({ oid: ent.oid, value: val })
							.onConflict((c) => c.columns(['oid', 'value']).doNothing())
							.execute();
					}
				} else {
					this.checkBindableValue(value, `multi-value index ${key}`);
					await tx
						.insertInto(collectionMultiValueIndexTableName(collection, key))
						.values({ oid: ent.oid, value })
						.onConflict((c) => c.columns(['oid', 'value']).doNothing())
						.execute();
				}
			}
		}
	};

	reset = async (): Promise<void> => {
		const collections = Object.keys(this.ctx.schema.collections);
		await this.db.transaction().execute(async (tx) => {
			await Promise.all(
				collections.map((name) =>
					tx.deleteFrom(collectionTableName(name)).execute(),
				),
			);
		});
	};

	stats = async (): Promise<
		Record<string, { count: number; size: number }>
	> => {
		const collections = Object.keys(this.ctx.schema.collections);
		const stats = await Promise.all(
			collections.map(
				async (coll) =>
					[coll, await this.tableStats(collectionTableName(coll))] as const,
			),
		);
		return Object.fromEntries(
			stats.map(([coll, stat]) => [
				coll,
				{
					count: stat?.count ?? 0,
					size: 0, // not supported
				},
			]),
		);
	};

	close = async () => {
		// nothing to do.
	};

	private checkBindableValue = (value: any, debug?: string) => {
		const type = typeof value;
		if (!['number', 'string', 'bigint'].includes(type)) {
			if (value instanceof Buffer) {
				return;
			}
			if (value === null) {
				return;
			}
			throw new Error(`Invalid bindable value: ${value} ${debug}`);
		}
	};
}
