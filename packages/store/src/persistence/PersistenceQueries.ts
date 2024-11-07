import { PersistenceDocumentDb } from './interfaces.js';
import { Context } from '../context/context.js';
import { decomposeOid, ObjectIdentifier } from '@verdant-web/common';

export class PersistenceDocuments {
	constructor(
		private db: PersistenceDocumentDb,
		private ctx: Omit<Context, 'queries'>,
	) {}

	reset = this.db.reset.bind(this.db);

	close = this.db.close.bind(this.db);

	saveEntities = async (
		entities: { oid: ObjectIdentifier; getSnapshot: () => any }[],
		options?: { abort?: AbortSignal },
	) => {
		if (entities.length === 0) return;

		// filter entities to remove collections which don't
		// exist in the schema anymore
		const currentCollectionSet = new Set(
			Object.keys(this.ctx.schema.collections),
		);
		const collections: string[] = [];
		const filteredEntities = entities.filter((entity) => {
			const { collection } = decomposeOid(entity.oid);
			if (!currentCollectionSet.has(collection)) {
				this.ctx.log(
					'warn',
					`Entity ${entity.oid} is in a collection that no longer exists in the schema. It will not be saved.`,
				);
				return false;
			}
			if (!collections.includes(collection)) collections.push(collection);
			return true;
		});

		if (collections.length === 0) return;

		this.ctx.log('debug', 'Saving', filteredEntities.length, 'entities');
		await this.db.saveEntities(filteredEntities, {
			abort: options?.abort,
			collections,
		});
		this.ctx.log('debug', 'Saved', filteredEntities.length, 'entities');
		this.ctx.entityEvents.emit('collectionsChanged', collections);
		for (const entity of entities) {
			this.ctx.entityEvents.emit('documentChanged', entity.oid);
		}
	};

	findOneOid = this.db.findOneOid.bind(this.db);
	findAllOids = this.db.findAllOids.bind(this.db);

	stats = this.db.stats.bind(this.db);
}
