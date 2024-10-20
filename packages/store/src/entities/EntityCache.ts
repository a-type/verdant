import { Entity, EntityInit } from './Entity.js';
import { EntityFile } from '../files/EntityFile.js';
import { ObjectIdentifier } from '@verdant-web/common';

export class EntityCache {
	private cache = new Map<string, Entity | EntityFile>();

	constructor({ initial }: { initial?: Entity[] } = {}) {
		if (initial) {
			for (const entity of initial) {
				this.cache.set(entity.oid, entity);
			}
		}
	}

	get = (init: EntityInit): Entity => {
		if (this.cache.has(init.oid)) {
			return this.cache.get(init.oid)! as Entity;
		}
		const entity = new Entity(init);
		this.cache.set(init.oid, entity);
		return entity;
	};

	has = (oid: ObjectIdentifier) => {
		return this.cache.has(oid);
	};

	getCached = (oid: string) => {
		return this.cache.get(oid);
	};
}
