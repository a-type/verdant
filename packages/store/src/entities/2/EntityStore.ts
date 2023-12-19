import {
	DocumentBaseline,
	ObjectIdentifier,
	Operation,
	StorageFieldsSchema,
	StorageObjectFieldSchema,
	decomposeOid,
	isRootOid,
} from '@verdant-web/common';
import { Context } from '../../context.js';
import { Metadata } from '../../metadata/Metadata.js';
import { Entity } from './Entity.js';
import { Disposable } from '../../utils/Disposable.js';
import { TaggedOperation } from '../../types.js';

export class EntityStore extends Disposable {
	private ctx;
	private meta;

	constructor({ ctx, meta }: { ctx: Context; meta: Metadata }) {
		super();

		this.ctx = ctx;
		this.meta = meta;
	}

	hydrate = async (oid: string): Promise<Entity | null> => {
		if (!isRootOid(oid)) {
			throw new Error('Cannot hydrate non-root entity');
		}
		const { collection } = decomposeOid(oid);
		const { schema, readonlyKeys } = this.getCollectionSchema(collection);

		if (!schema) {
			return null;
		}

		if (this.disposed) {
			throw new Error('Cannot hydrate entity after store has been disposed');
		}

		const transaction = this.meta.createTransaction([
			'baselines',
			'operations',
		]);
		const baselines: Record<ObjectIdentifier, DocumentBaseline> = {};
		const confirmedOperations: Record<ObjectIdentifier, Operation[]> = {};

		await Promise.all([
			this.meta.baselines.iterateOverAllForDocument(
				oid,
				(baseline) => {
					baselines[baseline.oid] = baseline;
				},
				{
					transaction,
				},
			),
			this.meta.operations.iterateOverAllOperationsForDocument(
				oid,
				(op) => {
					confirmedOperations[op.oid] ??= [];
					confirmedOperations[op.oid].push(op);
				},
				{ transaction },
			),
		]);

		const pendingOperations: Record<ObjectIdentifier, Operation[]> = {};

		return new Entity({
			ctx: this.ctx,
			oid,
			schema,
		});
	};

	private getCollectionSchema = (
		collectionName: string,
	): {
		schema: StorageFieldsSchema | null;
		readonlyKeys: string[];
	} => {
		const schema = this.ctx.schema.collections[collectionName];
		if (!schema) {
			this.ctx.log('warn', `Missing schema for collection: ${collectionName}`);
			return {
				schema: null,
				readonlyKeys: [],
			};
		}
		return {
			schema: schema.fields,
			readonlyKeys: [schema.primaryKey],
		};
	};
}
