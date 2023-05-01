import { CollectionFilter, createOid } from '@lo-fi/common';
import { Context } from '../context.js';
import { getRange } from './ranges.js';

function getStore(db: IDBDatabase, collection: string, write?: boolean) {
	return db
		.transaction(collection, write ? 'readwrite' : 'readonly')
		.objectStore(collection);
}

export async function findOneOid({
	collection,
	index,
	context,
}: {
	collection: string;
	index?: CollectionFilter;
	context: Context;
}) {
	const store = getStore(context.documentDb, collection);
	const source = index ? store.index(index.where) : store;
	const range = getRange(context.schema, collection, index);
	const direction = index?.order === 'desc' ? 'prev' : 'next';
	const request = source.openCursor(range, direction);
	const result = await new Promise<string | null>((resolve, reject) => {
		request.onsuccess = () => {
			const cursor = request.result;
			if (cursor) {
				resolve(createOid(collection, cursor.primaryKey.toString()));
			} else {
				resolve(null);
			}
		};
		request.onerror = () => {
			if (request.error?.name === 'InvalidStateError') {
				context.log(
					'error',
					`findOne query failed with InvalidStateError`,
					request.error,
				);
				resolve(null);
			} else {
				reject(request.error);
			}
		};
	});
	return result;
}

export async function findAllOids({
	collection,
	index,
	context,
}: {
	collection: string;
	index?: CollectionFilter;
	context: Context;
}) {
	const store = getStore(context.documentDb, collection);
	const source = index ? store.index(index.where) : store;
	const range = getRange(context.schema, collection, index);
	const direction = index?.order === 'desc' ? 'prev' : 'next';
	const request = source.openCursor(range, direction);
	const result = await new Promise<string[]>((resolve, reject) => {
		const results: string[] = [];
		request.onsuccess = () => {
			const cursor = request.result;
			if (cursor) {
				results.push(createOid(collection, cursor.primaryKey.toString()));
				cursor.continue();
			} else {
				resolve(results);
			}
		};
		request.onerror = () => {
			if (request.error?.name === 'InvalidStateError') {
				context.log(
					'error',
					`findAll query failed with InvalidStateError`,
					request.error,
				);
				resolve([]);
			} else {
				reject(request.error);
			}
		};
	});
	return result;
}

export async function findPageOfOids({
	collection,
	index,
	context,
	limit,
	offset,
}: {
	collection: string;
	index?: CollectionFilter;
	context: Context;
	limit?: number;
	offset?: number;
}) {
	const store = getStore(context.documentDb, collection);
	const source = index ? store.index(index.where) : store;
	const range = getRange(context.schema, collection, index);
	const direction = index?.order === 'desc' ? 'prev' : 'next';
	const request = source.openCursor(range, direction);
	let hasDoneOffset = !offset;
	let hasNextPage = false;
	let visited = 0;
	const result = await new Promise<string[]>((resolve, reject) => {
		const results: string[] = [];
		request.onsuccess = () => {
			visited++;
			const cursor = request.result;
			if (cursor) {
				if (offset && !hasDoneOffset) {
					cursor.advance(offset);
					hasDoneOffset = true;
				} else {
					if (limit && results.length < limit) {
						results.push(createOid(collection, cursor.primaryKey.toString()));
					}
					if (limit && visited > limit) {
						hasNextPage = true;
						resolve(results);
					} else {
						cursor.continue();
					}
				}
			} else {
				resolve(results);
			}
		};
		request.onerror = () => {
			if (request.error?.name === 'InvalidStateError') {
				context.log(
					'error',
					`find query failed with InvalidStateError`,
					request.error,
				);
				resolve([]);
			} else {
				reject(request.error);
			}
		};
	});

	return {
		result: result as string[],
		hasNextPage,
	};
}
