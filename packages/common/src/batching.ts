interface Batch<T> {
	items: Array<T>;
	max: number;
	startedAt: number;
	flushTimeout?: NodeJS.Timeout;
}

export class Batcher<T> {
	private batches: Map<string, Batch<T>> = new Map();
	private defaultMax;
	private defaultTimeout;

	constructor(
		private flusher: (items: T[], batchKey: string) => any,
		{
			max,
			timeout,
		}: {
			max?: number;
			timeout?: number;
		} = {},
	) {
		this.defaultMax = max || 100;
		this.defaultTimeout = timeout || 1000;
	}

	add(key: string, ...items: T[]) {
		let batch = this.batches.get(key);
		let needsSchedule = false;
		if (!batch) {
			needsSchedule = true;
			batch = {
				items,
				max: this.defaultMax,
				startedAt: Date.now(),
			};
			this.batches.set(key, batch);
		} else {
			needsSchedule = batch.items.length === 0;
			batch.items.push(...items);
		}

		if (batch.items.length >= batch.max) {
			this.flush(key);
		} else if (needsSchedule) {
			batch.flushTimeout = this.scheduleFlush(key);
		}
	}

	flush = async (key: string) => {
		const batch = this.batches.get(key);
		if (!batch) return;

		batch.flushTimeout && clearTimeout(batch.flushTimeout);
		const items = batch.items;
		batch.items = [];
		this.flusher(items, key);
	};

	private scheduleFlush = (key: string) => {
		return setTimeout(() => this.flush(key), this.defaultTimeout);
	};
}
