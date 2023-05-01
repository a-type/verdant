import { EventSubscriber } from '@lo-fi/common';
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
};

export type QueryStatus = 'initial' | 'running' | 'ready';

export const ON_ALL_UNSUBSCRIBED = Symbol('ON_ALL_UNSUBSCRIBED');
export const UPDATE = Symbol('UPDATE');

export abstract class BaseQuery<T> extends Disposable {
	private _rawValue;
	private _value;

	private _events;
	private _internalUnsubscribes: (() => void)[] = [];
	private _resolved: Resolvable<T> | null = null;
	private _allUnsubscribedHandler?: (query: BaseQuery<T>) => void;
	private _status: QueryStatus = 'initial';

	protected context;

	readonly collection;
	readonly key;

	constructor({ initial, context, collection, key }: BaseQueryOptions<T>) {
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
	}

	get current() {
		return this._value;
	}

	get resolved() {
		if (!this._resolved) {
			this._resolved = new Resolvable<T>();
			this.execute();
			return this._resolved.promise;
		}
		return this._resolved.promise;
	}

	get subscribed() {
		return this._events.totalSubscriberCount() > 0;
	}

	get status() {
		return this._status;
	}

	subscribe = (callback: (value: T) => void) => {
		return this._events.subscribe('change', callback);
	};

	protected setValue = (value: T) => {
		this._rawValue = value;
		this._value = filterResultSet(value);
		this.subscribeToDeleteAndRestore(this._value);
		this._status = 'ready';
		this._events.emit('change', this._value);
		this._resolved?.resolve(this._value);
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
				this._internalUnsubscribes.push(
					entity.subscribe('delete', this.refreshValue),
				);
				this._internalUnsubscribes.push(
					entity.subscribe('restore', this.refreshValue),
				);
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

	private execute = async () => {
		this._status = 'running';
		this._resolved = new Resolvable<T>();
		await this.run();
	};
	protected abstract run(): Promise<void>;

	[ON_ALL_UNSUBSCRIBED] = (handler: (query: BaseQuery<T>) => void) => {
		this._allUnsubscribedHandler = handler;
	};

	[UPDATE] = () => {
		this.execute();
	};
}
