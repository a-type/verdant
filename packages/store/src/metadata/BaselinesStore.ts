import {
	DocumentBaseline,
	getOidSubIdRange,
	getOidRoot,
	ObjectIdentifier,
	isLegacyDotOid,
	getLegacyDotOidSubIdRange,
} from '@verdant-web/common';
import { IDBService } from '../IDBService.js';

export class BaselinesStore extends IDBService {
	constructor(db: IDBDatabase) {
		super(db);
	}

	getAllForDocument = async (
		oid: ObjectIdentifier,
		{
			mode = 'readonly',
			transaction,
		}: { mode?: 'readwrite' | 'readonly'; transaction?: IDBTransaction } = {},
	) => {
		const baselines: DocumentBaseline[] = [];
		await this.iterateOverAllForDocument(
			oid,
			(baseline) => {
				baselines.push(baseline);
			},
			{ mode, transaction },
		);
		return baselines;
	};
	iterateOverAllForDocument = async (
		oid: ObjectIdentifier,
		iterator: (baseline: DocumentBaseline, store: IDBObjectStore) => void,
		{
			mode = 'readonly',
			transaction,
		}: { mode?: 'readwrite' | 'readonly'; transaction?: IDBTransaction } = {},
	) => {
		return this.iterate(
			'baselines',
			(store) => {
				const root = getOidRoot(oid);
				const [start, end] = getOidSubIdRange(oid);
				// FIXME: get rid of legacy dot OIDs...
				// if (isLegacyDotOid(oid)) {
					const [dotStart, dotEnd] = getLegacyDotOidSubIdRange(oid);
					return [
						store.get(root),
						store.getAll(IDBKeyRange.bound(start, end, false, false)),
						store.getAll(IDBKeyRange.bound(dotStart, dotEnd, false, false)),
					]
				// } else {
				// 	return [
				// 		// first the root itself
				// 		store.openCursor(IDBKeyRange.only(root)),
				// 		// then the range of its possible subdocuments
				// 		store.openCursor(IDBKeyRange.bound(start, end, false, false)),
				// 	];
				// }
			},
			iterator,
			mode,
			transaction,
		);
	};

	getAllForMultipleDocuments = async (
		docOids: string[],
		{ mode = 'readonly' }: { mode?: 'readwrite' | 'readonly' } = {},
	) => {
		const result = await this.runAll<DocumentBaseline[]>(
			'baselines',
			(store) => {
				return docOids.flatMap((oid) => {
					const root = getOidRoot(oid);
					const [start, end] = getOidSubIdRange(oid);
					// FIXME: get rid of legacy dot OIDs...
					// if (isLegacyDotOid(oid)) {
						const [dotStart, dotEnd] = getLegacyDotOidSubIdRange(oid);
						return [
							store.get(root),
							store.getAll(IDBKeyRange.bound(start, end, false, false)),
							store.getAll(IDBKeyRange.bound(dotStart, dotEnd, false, false)),
						]
					// } else {
					// 	return [
					// 		store.get(root),
					// 		store.getAll(IDBKeyRange.bound(start, end, false, false)),
					// 	];
					// }
				});
			},
			mode,
		);
		return result.flat();
	};

	getAllSince = async (
		timestamp: string | null,
		{ mode = 'readonly' }: { mode?: 'readwrite' | 'readonly' } = {},
	) => {
		return this.run<DocumentBaseline[]>(
			'baselines',
			(store) => {
				const range = timestamp
					? IDBKeyRange.lowerBound(timestamp, true)
					: undefined;
				const index = store.index('timestamp');
				return index.getAll(range);
			},
			mode,
		);
	};

	get = async (
		oid: ObjectIdentifier,
		{
			transaction,
			mode = 'readonly',
		}: { transaction?: IDBTransaction; mode?: 'readwrite' | 'readonly' } = {},
	) => {
		return this.run<DocumentBaseline>(
			'baselines',
			(store) => store.get(oid),
			mode,
			transaction,
		);
	};

	set = async <T>(
		baseline: DocumentBaseline<T>,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		await this.run(
			'baselines',
			(store) => store.put(baseline),
			'readwrite',
			transaction,
		);
	};

	setAll = async <T>(
		baselines: DocumentBaseline<T>[],
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		await this.runAll(
			'baselines',
			(store) => {
				return baselines.map((baseline) => store.put(baseline));
			},
			'readwrite',
			transaction,
		);
	};

	reset = () => {
		return this.clear('baselines');
	};

	delete = async (
		oid: ObjectIdentifier,
		{ transaction }: { transaction?: IDBTransaction },
	) => {
		await this.run(
			'baselines',
			(store) => store.delete(oid),
			'readwrite',
			transaction,
		);
	};
}
