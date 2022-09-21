export class EventSubscriber<
	Events extends Record<string, (...args: any[]) => void>,
> {
	private events: Record<keyof Events, Set<(...args: any[]) => void>> =
		{} as any;

	subscribe = <K extends keyof Events>(event: K, callback: Events[K]) => {
		if (!this.events[event]) {
			this.events[event] = new Set();
		}
		this.events[event].add(callback);
		return () => void this.events[event].delete(callback);
	};

	emit = <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
		if (this.events[event]) {
			this.events[event].forEach((c) => c(...args));
		}
	};
}

export type EventsOf<T extends EventSubscriber<any>> =
	T extends EventSubscriber<infer E> ? keyof E : never;
