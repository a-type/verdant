import { DocumentBaseline, getOidRange, ObjectIdentifier } from '@lofi/common';
import { IDBService } from './IDBService.js';

export class BaselinesStore extends IDBService {
	constructor(db: IDBDatabase) {
		super(db);
	}

	getAllForDocument = async (oid: ObjectIdentifier) => {
		return this.run<DocumentBaseline[]>(
			'baselines',
			(store) => {
				const [start, end] = getOidRange(oid);
				return store.getAll(IDBKeyRange.bound(start, end, false, false));
			},
			'readonly',
		);
	};

	getAllForMultipleDocuments = async (docOids: string[]) => {
		const result = await this.runAll<DocumentBaseline[]>(
			'baselines',
			(store) => {
				return docOids.map((oid) => {
					const [start, end] = getOidRange(oid);
					return store.getAll(IDBKeyRange.bound(start, end, false, false));
				});
			},
		);
		return result.flat();
	};

	get = async (oid: ObjectIdentifier) => {
		return this.run('baselines', (store) => store.get(oid), 'readonly');
	};

	set = async <T>(baseline: DocumentBaseline<T>) => {
		await this.run('baselines', (store) => store.put(baseline), 'readwrite');
	};

	reset = () => {
		return this.clear('baselines');
	};
}
