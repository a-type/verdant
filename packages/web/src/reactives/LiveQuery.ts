import type { EventsOf, EventSubscriber } from '../EventSubscriber.js';
import { CollectionEvents, StorageCollectionSchema } from '@lofi/common';

export const LIVE_QUERY_SUBSCRIBE = Symbol('LIVE_QUERY_SUBSCRIBE');
export const LIVE_QUERY_ACTIVATE = Symbol('LIVE_QUERY_ACTIVATE');

export class LiveQuery<
	Collection extends StorageCollectionSchema<any, any, any>,
	T,
> {
	private _current: T | null = null;
	private _subscribers: Set<(value: T | null) => void> = new Set();
	resolved: Promise<T>;

	constructor(
		readonly key: string,
		private exec: () => Promise<T>,
		private events: EventSubscriber<CollectionEvents<Collection>>,
		private triggers: (keyof CollectionEvents<Collection>)[],
	) {
		this.resolved = this.update();
	}

	get current() {
		return this._current;
	}

	private update = async () => {
		this._current = await this.exec();
		this._subscribers.forEach((subscriber) => subscriber(this._current));
		return this._current;
	};

	[LIVE_QUERY_ACTIVATE] = () => {
		const unsubs = this.triggers.map((trigger) =>
			this.events.subscribe(trigger, () => {
				console.debug('Recomputing query', this.key);
				this.resolved = this.update();
			}),
		);
		return () => {
			unsubs.forEach((unsub) => unsub());
		};
	};

	get subscriberCount() {
		return this._subscribers.size;
	}

	[LIVE_QUERY_SUBSCRIBE] = (callback: (value: T | null) => void) => {
		this._subscribers.add(callback);
		return () => {
			this._subscribers.delete(callback);
		};
	};
}
