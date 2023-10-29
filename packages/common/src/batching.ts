export class Batcher<T, UserData = any> {
	private batches: Map<string, Batch<T, UserData>> = new Map();

	constructor(
		private flusher: (items: T[], batchKey: string, userData: UserData) => any,
	) {}

	add({
		key,
		userData,
		items,
		max,
		timeout,
	}: {
		key: string;
		userData?: UserData;
		items: T[];
		max?: number | null;
		timeout?: number | null;
	}) {
		let batch = this.batches.get(key);
		if (!batch) {
			batch = new Batch({
				max: max || null,
				startedAt: Date.now(),
				userData,
				timeout: timeout || null,
				flusher: this.flusher,
				key,
			});
			this.batches.set(key, batch);
		}
		batch.update({
			items,
			max,
			timeout,
			userData,
		});

		return batch;
	}

	flush = (key: string) => {
		const batch = this.batches.get(key);
		if (!batch) return;

		return batch.flush();
	};

	discard = (key: string) => {
		const batch = this.batches.get(key);
		if (!batch) return;

		batch.discard();
		this.batches.delete(key);
	};

	flushAll = () => {
		return [...this.batches.values()].map((batch) => batch.flush());
	};
}

export class Batch<T, UserData = any> {
	items: Array<T> = [];
	max: number | null;
	startedAt: number;
	timeout: number | null;
	flushTimeout?: NodeJS.Timeout;
	userData?: any;
	flusher: (items: T[], batchKey: string, userData: UserData) => any;
	key: string;

	constructor({
		max,
		startedAt,
		timeout,
		userData,
		flusher,
		key,
	}: {
		key: string;
		max: number | null;
		startedAt: number;
		timeout: number | null;
		userData?: UserData;
		flusher: (items: T[], batchKey: string, userData: UserData) => any;
	}) {
		this.max = max;
		this.startedAt = startedAt;
		this.timeout = timeout;
		this.userData = userData;
		this.flusher = flusher;
		this.key = key;
	}

	update = ({
		items,
		max,
		timeout,
		userData,
	}: {
		items: Array<T>;
		max?: number | null;
		timeout?: number | null;
		userData?: UserData;
	}) => {
		this.items.push(...items);
		if (max !== undefined) this.max = max;
		if (timeout !== undefined) this.timeout = timeout;
		if (userData) this.userData = userData;

		// if the batch has items and a timeout but has not
		// scheduled yet, schedule it
		const needsSchedule =
			this.items.length !== 0 && this.timeout !== null && !this.flushTimeout;

		// if the batch has already reached its max, skip scheduling
		// and flush immediately
		if (this.max !== null && this.items.length >= this.max) {
			this.flush();
		} else if (needsSchedule && this.timeout !== null) {
			this.flushTimeout = setTimeout(this.flush, this.timeout);
		}
	};

	flush = () => {
		this.flushTimeout && clearTimeout(this.flushTimeout);
		this.flushTimeout = undefined;
		const items = this.items;
		this.items = [];
		return this.flusher(items, this.key, this.userData);
	};

	discard = () => {
		this.flushTimeout && clearTimeout(this.flushTimeout);
		this.flushTimeout = undefined;
		this.items = [];
	};
}
