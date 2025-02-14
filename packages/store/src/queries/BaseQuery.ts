import { EventSubscriber } from '@verdant-web/common';
import { Context } from '../context/context.js';
import { Entity } from '../entities/Entity.js';
import { Disposable } from '../utils/Disposable.js';
import { filterResultSet } from './utils.js';

export type BaseQueryEvents = {
	change: (value: any) => void;
	statusChange: (status: QueryStatus) => void;
};

export type BaseQueryOptions<T> = {
	context: Context;
	initial: T;
	collection: string;
	key: string;
	shouldUpdate?: (updatedCollections: string[]) => boolean;
};

export type QueryStatus = 'initial' | 'initializing' | 'revalidating' | 'ready';

export const ON_ALL_UNSUBSCRIBED = Symbol('ON_ALL_UNSUBSCRIBED');
export const UPDATE = Symbol('UPDATE');

// export interface BaseQuery<T> {
// 	subscribe(event: 'change', callback: (value: T) => void): () => void;
// 	subscribe(event: 'statusChange', callback: (status: QueryStatus) => void): () => void;
// 	subscribe(callback: (value: T) => void): () => void;
// }

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
	readonly isListQuery;

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
		this.isListQuery = Array.isArray(initial);
		this._events = new EventSubscriber<BaseQueryEvents>(
			(event: keyof BaseQueryEvents) => {
				if (event === 'change') {
					this._allUnsubscribedHandler?.(this);
				}
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
						// immediately refilter the result set - deleted
						// entities will already be nulled out
						// this.refreshValue();
						this.execute();
					}
				},
			),
		);
		// TODO: subscribe to document changes and update if necessary.
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

	private set status(v: QueryStatus) {
		if (this._status === v) return;
		this._status = v;
		this._events.emit('statusChange', this._status);
	}

	get hasDeleted() {
		if (this.isListQuery) {
			return (this._rawValue as any[]).length !== (this._value as any[]).length;
		}
		return !!this._rawValue && !this._value;
	}

	/**
	 * Subscribe to changes in the query value.
	 *
	 * @deprecated use the two parameter form instead
	 */
	subscribe(callback: (value: T) => void): () => void;
	/**
	 * Subscribe to changes in the query value.
	 */
	subscribe(event: 'change', callback: (value: T) => void): () => void;
	/**
	 * Subscribe to changes in the query state.
	 */
	subscribe(
		event: 'statusChange',
		callback: (status: QueryStatus) => void,
	): () => void;
	subscribe(eventOrCallback: any, callback?: any) {
		// change subscription has special behavior...
		if (callback === undefined && typeof eventOrCallback === 'function') {
			// accessing for side effects... eh
			this.resolved;
			return this._events.subscribe('change', eventOrCallback);
		} else if (eventOrCallback === 'change' && callback !== undefined) {
			// accessing for side effects... eh
			this.resolved;
			return this._events.subscribe('change', callback);
		} else if (
			eventOrCallback === 'statusChange' &&
			typeof callback === 'function'
		) {
			return this._events.subscribe(eventOrCallback, callback);
		} else {
			throw new Error('Invalid invocation of Query.subscribe');
		}
	}

	protected setValue = (value: T) => {
		this._rawValue = value;
		this.subscribeToDeleteAndRestore(this._rawValue);
		const filtered = filterResultSet(value);

		// prevent excess change notifications by diffing
		// value by identity for single-value queries,
		// and by item identity for multi-value
		let changed = true;
		// always fire change when going from initial to ready
		if (this.status === 'initializing' || this.status === 'initial') {
			changed = true;
		} else {
			// compare values by identity, after filtering.
			if (this.isListQuery) {
				if (
					(this._value as any[]).length === (filtered as any[]).length &&
					(this._value as any[]).every((v, i) => v === (filtered as any[])[i])
				) {
					changed = false;
				}
			} else {
				if (this._value === filtered) {
					changed = false;
				}
			}
		}

		this._value = filtered;

		if (changed) {
			this.context.log('debug', 'Query value changed', this.key);
			this._events.emit('change', this._value);
		}
		this.status = 'ready';
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

		if (this.status === 'initial') {
			this.status = 'initializing';
		} else if (this.status === 'ready') {
			this.status = 'revalidating';
		}
		// no status change needed if already in a 'running' status.

		this._executionPromise = this.run()
			.then(() => this._value)
			.catch((err) => {
				if (err instanceof Error) {
					if (
						err.name === 'InvalidStateError' ||
						err.name === 'InvalidAccessError'
					) {
						// possibly accessing db while it's closed. not much we can do.
						return this._value;
					}
					throw err;
				} else {
					throw new Error('Unknown error executing query');
				}
			});
		return this._executionPromise;
	};
	protected abstract run(): Promise<void>;

	[ON_ALL_UNSUBSCRIBED] = (handler: (query: BaseQuery<T>) => void) => {
		this._allUnsubscribedHandler = handler;
	};

	get __rawValue() {
		return this._rawValue;
	}
}
