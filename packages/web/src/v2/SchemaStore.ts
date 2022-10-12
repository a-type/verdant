import { StorageSchema } from '@lo-fi/common';
import { storeRequestPromise } from './idb.js';

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
		return JSON.parse(value.schema);
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
