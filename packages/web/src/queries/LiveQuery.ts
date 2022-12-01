import { ObjectEntity } from '../reactives/Entity.js';
import { BaseQuery, Query } from './Query.js';

export const UPDATE = '@@update';

export class LiveQuery<
	T extends (ObjectEntity<any, any> | null) | ObjectEntity<any, any>[],
> implements BaseQuery<T>
{
	private _rawEntities: T | null = null;
	private _resultEntities: T | null = null;
	private _subscribers: Set<(value: T | null) => void> = new Set();
	resolved: Promise<T>;

	private _internalUnsubscribes: (() => void)[] = [];
	private _disposed = false;

	get id() {
		return this.query.id;
	}

	get collection() {
		return this.query.collection;
	}

	get key() {
		return this.query.key;
	}

	constructor(
		private readonly query: Query<T>,
		private readonly onActivate: (query: LiveQuery<T>) => void,
		private readonly onDispose: (query: LiveQuery<T>) => void,
	) {
		this.resolved = this.execute();
	}

	private filterDeleted = (entities: T | null): T | null => {
		if (Array.isArray(entities)) {
			return entities.filter((entity) => !entity.deleted) as any;
		}
		return entities?.deleted ? null : entities;
	};

	private execute = async (): Promise<T> => {
		this._rawEntities = await this.query.execute();
		this.subscribeToDeleteAndRestore(this._rawEntities);
		this._resultEntities = this.filterDeleted(this._rawEntities);
		this._subscribers.forEach((subscriber) => subscriber(this._resultEntities));
		return this._resultEntities as any;
	};

	private subscribeToDeleteAndRestore = (result: T) => {
		while (this._internalUnsubscribes.length) {
			this._internalUnsubscribes.pop()?.();
		}

		if (Array.isArray(result)) {
			result.forEach((entity) => {
				this._internalUnsubscribes.push(
					entity.subscribe('delete', this.refilterDeleted),
				);
				this._internalUnsubscribes.push(
					entity.subscribe('restore', this.refilterDeleted),
				);
			});
		} else if (result) {
			this._internalUnsubscribes.push(
				result.subscribe('delete', this.refilterDeleted),
			);
			this._internalUnsubscribes.push(
				result.subscribe('restore', this.refilterDeleted),
			);
		}
	};

	get current() {
		return this._resultEntities;
	}

	[UPDATE] = () => {
		if (this._disposed) return;
		this.resolved = this.execute();
	};

	dispose = () => {
		this._subscribers.clear();
		this._internalUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this._internalUnsubscribes = [];
		this.query.dispose();
		this._disposed = true;
	};

	private refilterDeleted = () => {
		this._resultEntities = this.filterDeleted(this._rawEntities);
		this._subscribers.forEach((subscriber) => subscriber(this._resultEntities));
	};

	subscribe = (callback: (value: T | null) => void) => {
		this._subscribers.add(callback);
		if (this._subscribers.size === 1) {
			this.onActivate(this);
		}
		return () => {
			this._subscribers.delete(callback);
			if (this._subscribers.size === 0) {
				this.onDispose(this);
			}
		};
	};

	get subscriberCount() {
		return this._subscribers.size;
	}

	get isActive() {
		return this.subscriberCount > 0;
	}
}
