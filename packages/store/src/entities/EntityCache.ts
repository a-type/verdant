import { ObjectIdentifier } from '@verdant-web/common';
import { Context } from '../internal.js';
import { Entity, EntityInit } from './Entity.js';

export class EntityCache {
	private ctx: Context;
	private cache = new Map<string, WeakRef<Entity>>();

	constructor({ initial, ctx }: { initial?: Entity[]; ctx: Context }) {
		this.ctx = ctx;
		if (initial) {
			for (const entity of initial) {
				this.cache.set(entity.oid, ctx.weakRef(entity));
			}
		}
	}

	get = (init: EntityInit): Entity => {
		const cached = this.getCached(init.oid);
		if (cached) return cached;
		const entity = new Entity(init);
		this.cache.set(init.oid, this.ctx.weakRef(entity));
		return entity;
	};

	has = (oid: ObjectIdentifier) => {
		return this.cache.has(oid);
	};

	getCached = (oid: string) => {
		if (this.cache.has(oid)) {
			const ref = this.cache.get(oid);
			const derefed = ref?.deref();
			if (derefed) {
				return derefed as Entity;
			} else {
				this.cache.delete(oid);
			}
		}
		return null;
	};
}
