import { Context } from '../context/context.js';

const BATCH_SIZE = 20;

type QueuedRun = {
	run: () => Promise<any>;
	resolve: (value: any) => void;
	reject: (reason?: any) => void;
};

class QueryBatcher {
	private queue: QueuedRun[] = [];
	private scheduled = false;

	enqueue<T>(run: () => Promise<T>): Promise<T> {
		const promise = new Promise<T>((resolve, reject) => {
			this.queue.push({ run, resolve, reject });
		});

		if (!this.scheduled) {
			this.scheduled = true;
			queueMicrotask(this.flush);
		}

		return promise;
	}

	private flush = () => {
		const batch = this.queue.splice(0, BATCH_SIZE);
		for (const { run, resolve, reject } of batch) {
			run().then(resolve, reject);
		}

		if (this.queue.length) {
			setTimeout(this.flush, 0);
		} else {
			this.scheduled = false;
		}
	};
}

const batchers = new WeakMap<Context, QueryBatcher>();

export function enqueueQueryRun<T>(
	context: Context,
	run: () => Promise<T>,
): Promise<T> {
	let batcher = batchers.get(context);
	if (!batcher) {
		batcher = new QueryBatcher();
		batchers.set(context, batcher);
	}
	return batcher.enqueue(run);
}
