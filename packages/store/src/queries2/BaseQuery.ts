import { EventSubscriber } from '@verdant-web/common';
import { filterResultSet } from './utils.js';
import { Entity } from '../reactives/Entity.js';
import { Disposable } from '../utils/Disposable.js';
import { Context } from '../context.js';
import { Resolvable } from '../utils/Resolvable.js';

export type BaseQueryEvents = {
	change: (value: any) => void;
};

export type BaseQueryOptions<T> = {
	context: Context;
	initial: T;
	collection: string;
	key: string;
	shouldUpdate?: (updatedCollections: string[]) => boolean;
};

export type QueryStatus = 'initial' | 'running' | 'ready';

export const ON_ALL_UNSUBSCRIBED = Symbol('ON_ALL_UNSUBSCRIBED');
export const UPDATE = Symbol('UPDATE');

export abstract class BaseQuery<T> extends Disposable {
	private _rawValue;
	private _value;

	private _events;
	private _internalUnsubscribes: (() => void)[] = [];
	private _allUnsubscribedHandler?: (query: BaseQuery<T>) => void;
	private _status: QueryStatus = 'initial';
	private _executionPromise: Promise<T> | null = null;

	protected context;

	readonly collection;
	readonly key;

	constructor({
		initial,
		context,
		collection,
		key,
		shouldUpdate,
	}: BaseQueryOptions<T>) {
		super();
		this._rawValue = initial;
		this._value = initial;
		this._events = new EventSubscriber<BaseQueryEvents>(
			(event: keyof BaseQueryEvents) => {
				if (event === 'change') this._allUnsubscribedHandler?.(this);
			},
		);
		this.context = context;
		this.key = key;
		this.collection = collection;
		const shouldUpdateFn =
			shouldUpdate ||
			((collections: string[]) => collections.includes(collection));
		this.addDispose(
			this.context.entityEvents.subscribe(
				'collectionsChanged',
				(collections) => {
					if (shouldUpdateFn(collections)) {
						this.context.log('info', 'Updating query', this.key);
						this.execute();
					}
				},
			),
		);
	}

	get current() {
		return this._value;
	}

	get resolved() {
		if (this.status === 'ready') return Promise.resolve(this._value);
		return this._executionPromise ?? this.execute();
	}

	get subscribed() {
		return this._events.totalSubscriberCount() > 0;
	}

	get status() {
		return this._status;
	}

	subscribe = (callback: (value: T) => void) => {
		// accessing for side effects... eh
		this.resolved;
		return this._events.subscribe('change', callback);
	};

	protected setValue = (value: T) => {
		this._rawValue = value;
		this.subscribeToDeleteAndRestore(this._rawValue);
		this._value = filterResultSet(value);
		this._status = 'ready';
		this._events.emit('change', this._value);
	};

	// re-applies filtering if results have changed
	protected refreshValue = () => {
		this.setValue(this._rawValue);
	};

	private subscribeToDeleteAndRestore = (value: T) => {
		while (this._internalUnsubscribes.length) {
			this._internalUnsubscribes.pop()?.();
		}

		if (Array.isArray(value)) {
			value.forEach((entity: any) => {
				if (entity instanceof Entity) {
					this._internalUnsubscribes.push(
						entity.subscribe('delete', this.refreshValue),
					);
					this._internalUnsubscribes.push(
						entity.subscribe('restore', this.refreshValue),
					);
				}
			});
		} else if (value instanceof Entity) {
			this._internalUnsubscribes.push(
				value.subscribe('delete', this.refreshValue),
			);
			this._internalUnsubscribes.push(
				value.subscribe('restore', () => {
					this.refreshValue();
				}),
			);
		}
	};

	execute = () => {
		this.context.log('debug', 'Executing query', this.key);
		this._status = 'running';
		this._executionPromise = this.run().then(() => this._value);
		return this._executionPromise;
	};
	protected abstract run(): Promise<void>;

	[ON_ALL_UNSUBSCRIBED] = (handler: (query: BaseQuery<T>) => void) => {
		this._allUnsubscribedHandler = handler;
	};
}
