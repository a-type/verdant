import { Entity } from '../reactives/Entity.js';
import { BaseQuery, Query } from './Query.js';

export const UPDATE = '@@update';

export class LiveQuery<T = any, Params = undefined> implements BaseQuery<T> {
	private _rawValue: T;
	private _value: T;
	private _subscribers: Set<(value: T | null) => void> = new Set();
	resolved: Promise<T>;

	private _internalUnsubscribes: (() => void)[] = [];
	private _disposed = false;

	private executeInfo = { hasNext: false };

	get id() {
		return this.query.id;
	}

	get collection() {
		return this.query.collection;
	}

	get key() {
		return this.query.key;
	}

	get params() {
		return this._params;
	}

	get hasNext() {
		return this.executeInfo.hasNext;
	}

	constructor(
		private readonly query: Query<T, Params>,
		private readonly onActivate: (query: LiveQuery<T, Params>) => void,
		private readonly onDispose: (query: LiveQuery<T, Params>) => void,
		initial: T,
		private _params: Params,
		private _updater: (previous: T, value: T) => T,
	) {
		this._rawValue = initial;
		this._value = this.filterDeleted(initial);
		this.resolved = this.execute();
	}

	private filterDeleted = (entities: T): T => {
		if (Array.isArray(entities)) {
			return entities.filter((entity) => !entity.deleted) as any;
		} else if (entities instanceof Entity) {
			return entities.deleted ? (null as any) : entities;
		}
		return entities;
	};

	private execute = async (params: Params = this._params): Promise<T> => {
		this._params = params;
		this._rawValue = this._updater(
			this._value,
			await this.query.execute(params, this.executeInfo),
		);
		this.subscribeToDeleteAndRestore(this._rawValue);
		this._value = this.filterDeleted(this._rawValue);
		this._subscribers.forEach((subscriber) => subscriber(this._value));
		return this._value as any;
	};

	private subscribeToDeleteAndRestore = (result: T) => {
		while (this._internalUnsubscribes.length) {
			this._internalUnsubscribes.pop()?.();
		}

		if (Array.isArray(result)) {
			result.forEach((entity: Entity) => {
				this._internalUnsubscribes.push(
					entity.subscribe('delete', this.refilterDeleted),
				);
				this._internalUnsubscribes.push(
					entity.subscribe('restore', this.refilterDeleted),
				);
			});
		} else if (result instanceof Entity) {
			this._internalUnsubscribes.push(
				result.subscribe('delete', this.refilterDeleted),
			);
			this._internalUnsubscribes.push(
				result.subscribe('restore', this.refilterDeleted),
			);
		}
	};

	get current() {
		return this._value;
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
		this._value = this.filterDeleted(this._rawValue);
		this._subscribers.forEach((subscriber) => subscriber(this._value));
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

	update = (params: Params) => {
		return this.execute(params);
	};

	get subscriberCount() {
		return this._subscribers.size;
	}

	get isActive() {
		return this.subscriberCount > 0;
	}
}
