import { Entity, EntityInit } from './Entity.js';

export class EntityCache {
	private cache = new Map<string, Entity>();

	get = (init: EntityInit<any>) => {
		if (this.cache.has(init.oid)) {
			return this.cache.get(init.oid)!;
		}
		return new Entity(init);
	};

	getCached = (oid: string) => {
		return this.cache.get(oid);
	};
}
