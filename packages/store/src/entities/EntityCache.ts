import { ObjectIdentifier } from '@verdant-web/common';
import { Entity } from './Entity.js';

export class EntityCache {
	private _cache = new Map<ObjectIdentifier, WeakRef<Entity>>();

	public getOr(id: string, or: () => Entity): Entity {
		const cached = this._cache.get(id)?.deref();
		if (!cached) {
			const entity = or();
			this._cache.set(id, new WeakRef(entity));
			return entity;
		}
		return cached;
	}

	public getUnresolved(id: string): Entity | undefined {
		return this._cache.get(id)?.deref();
	}

	clear() {
		this._cache.clear();
	}

	map<T>(fn: (entity: Entity) => T): T[] {
		const result: T[] = [];
		this._cache.forEach((ref) => {
			const entity = ref.deref();
			if (entity) {
				result.push(fn(entity));
			}
		});
		return result;
	}
}
