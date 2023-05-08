import { StorageSchema } from '@verdant-web/common';
import { storeRequestPromise } from '../idb.js';

type StoredSchema = {
	type: 'schema';
	schema: string;
};

export class SchemaStore {
	private cached: StorageSchema<any> | null = null;

	constructor(
		private readonly db: IDBDatabase,
		public readonly currentVersion: number,
	) {}

	get = async (): Promise<StorageSchema<any> | null> => {
		if (this.cached) {
			return this.cached;
		}

		const db = this.db;
		const transaction = db.transaction('info', 'readonly');
		const store = transaction.objectStore('info');
		const request = store.get('schema');
		const value = (await storeRequestPromise(request)) as
			| StoredSchema
			| undefined;
		if (!value) {
			return null;
		}
		this.cached = JSON.parse(value.schema);
		return this.cached;
	};

	set = async (schema: StorageSchema<any>): Promise<void> => {
		const db = this.db;
		const transaction = db.transaction('info', 'readwrite');
		const store = transaction.objectStore('info');
		const request = store.put({
			type: 'schema',
			schema: JSON.stringify(schema),
		} as StoredSchema);
		this.cached = schema;
		await storeRequestPromise(request);
	};
}
