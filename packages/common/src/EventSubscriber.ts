import { generateId } from './utils.js';

export class EventSubscriber<
	Events extends { [key: string]: (...args: any[]) => void },
> {
	protected subscribers: Record<
		string,
		Record<string, (...args: any[]) => void>
	> = {} as any;
	protected counts: Record<string, number> = {} as any;
	private _disabled = false;
	protected disposed = false;

	constructor(private _onAllUnsubscribed?: (event: keyof Events) => void) {}

	get disabled() {
		return this._disabled;
	}

	subscriberCount = (event: Extract<keyof Events, string>) => {
		return this.counts[event] ?? 0;
	};

	totalSubscriberCount = () => {
		return Object.values(this.counts).reduce((acc, count) => acc + count, 0);
	};

	subscribe = <K extends Extract<keyof Events, string>>(
		event: K,
		callback: Events[K],
	) => {
		const key = generateId();
		let subscribers = this.subscribers[event];
		if (!subscribers) {
			subscribers = this.subscribers[event] = {};
		}
		subscribers[key] = callback;
		this.counts[event] = (this.counts[event] || 0) + 1;
		return () => {
			// already removed
			if (!this.subscribers[event]) return;

			delete this.subscribers[event][key];
			this.counts[event]--;
			if (this.counts[event] === 0) {
				delete this.subscribers[event];
				delete this.counts[event];
				if (this._onAllUnsubscribed) {
					this._onAllUnsubscribed(event);
				}
			}
		};
	};

	emit = <K extends Extract<keyof Events, string>>(
		event: K,
		...args: Parameters<Events[K]>
	) => {
		if (this._disabled) return;
		if (this.subscribers[event]) {
			Object.values(this.subscribers[event]).forEach((c) => c(...args));
		}
	};

	dispose = () => {
		this._disabled = true;
		this.disposed = true;
		const events = Object.keys(this.subscribers);
		this.subscribers = {} as any;
		this.counts = {} as any;
		events.forEach((event) => {
			if (this._onAllUnsubscribed) {
				this._onAllUnsubscribed(event);
			}
		});
	};

	disable = () => {
		this._disabled = true;
	};
}

export type EventsOf<T extends EventSubscriber<any>> =
	T extends EventSubscriber<infer E> ? keyof E : never;
