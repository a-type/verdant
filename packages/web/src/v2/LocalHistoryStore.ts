import { storeRequestPromise } from './idb.js';
import { IDBService } from './IDBService.js';

type LocalHistoryItem = {
	timestamp: string;
};
type LocalHistory = {
	type: 'localHistory';
	items: LocalHistoryItem[];
};

export class LocalHistoryStore extends IDBService {
	localHistoryLength = 10;

	get = async (): Promise<LocalHistory> => {
		const result = await this.run<LocalHistory>('info', (store) =>
			store.get('localHistory'),
		);

		if (result) {
			return result;
		} else {
			return {
				type: 'localHistory',
				items: [],
			};
		}
	};

	add = async (item: LocalHistoryItem) => {
		// TODO: PERF: cache this in memory
		const transaction = this.db.transaction('info', 'readwrite');
		let history = await this.run<LocalHistory>(
			'info',
			(store) => store.get('localHistory'),
			'readonly',
			transaction,
		);
		if (!history) {
			history = {
				type: 'localHistory',
				items: [],
			};
		}

		// TODO: PERF: find a better way to avoid duplicate items
		const existing = history.items.find((i) => i.timestamp === item.timestamp);
		if (existing) {
			return history.items[0].timestamp;
		}

		history.items.push({
			timestamp: item.timestamp,
		});
		// drop old items
		if (history.items.length > this.localHistoryLength) {
			history.items.shift();
		}
		const oldestHistoryTimestamp = history.items[0].timestamp;
		await this.run(
			'info',
			(store) => store.put(history),
			'readwrite',
			transaction,
		);
		return oldestHistoryTimestamp;
	};

	reset = async () => {
		await this.run(
			'info',
			(store) => store.delete('localHistory'),
			'readwrite',
		);
	};
}
