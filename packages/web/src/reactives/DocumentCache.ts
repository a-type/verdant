import {
	StorageCollectionSchema,
	StorageDocument,
	SyncOperation,
	SyncPatch,
} from '@lofi/common';
import { assign, createLiveDocument, LiveDocument } from './LiveDocument.js';

export interface DocumentMutations {
	applyOperations(operations: { documentId: string; patch: SyncPatch }[]): void;
}

export class DocumentCache<
	Collection extends StorageCollectionSchema<any, any>,
> {
	private docs: Map<string, LiveDocument<StorageDocument<Collection>>> =
		new Map();

	constructor(
		private mutations: DocumentMutations,
		private primaryKey: keyof StorageDocument<Collection>,
	) {}

	get = (
		source: StorageDocument<Collection>,
	): LiveDocument<StorageDocument<Collection>> => {
		const key = source[this.primaryKey] as string;
		let doc = this.docs.get(key);
		if (!doc) {
			doc = createLiveDocument({
				initial: source,
				context: {
					id: key,
					mutations: this.mutations,
				},
				dispose: () => this.dispose(key),
			});
			this.docs.set(key, doc);
		}
		return doc;
	};

	assign = (id: string, data: StorageDocument<Collection> | null) => {
		if (this.docs.has(id)) {
			assign(this.docs.get(id), data);
		}
	};

	dispose = (key: string) => {
		this.docs.delete(key);
	};

	stats = () => {
		return {
			documentCount: this.docs.size,
		};
	};
}
