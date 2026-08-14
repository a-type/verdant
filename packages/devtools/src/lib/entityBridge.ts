import type { StorageFieldSchema } from '@verdant-web/common';
import { evalAsync } from './bridge.js';
import type { EntityPath } from './entitySchema.js';

export type EntityNode = {
	schema: StorageFieldSchema;
	snapshot: unknown;
};

function navigatePreamble(
	collection: string,
	primaryKey: unknown,
	path: EntityPath,
) {
	return `
		var client = window.__VERDANT_CLIENT__;
		if (!client) throw new Error('No Verdant client found on the inspected page.');
		var col = client[${JSON.stringify(collection)}];
		if (!col) throw new Error(${JSON.stringify(`Unknown collection: ${collection}`)});
		var root = await col.get(${JSON.stringify(primaryKey)}).resolved;
		if (!root) throw new Error('Document not found (it may have been deleted).');
		var entity = root;
		for (var key of ${JSON.stringify(path)}) {
			entity = entity.get(key);
			if (entity === undefined || entity === null) {
				throw new Error('Path no longer exists on this entity.');
			}
		}
	`;
}

/** Fetches the schema and current snapshot for the container entity at `path`. */
export async function fetchEntityNode(
	collection: string,
	primaryKey: unknown,
	path: EntityPath,
): Promise<EntityNode | null> {
	return evalAsync<EntityNode | null>(`
		${navigatePreamble(collection, primaryKey, path)}
		return { schema: entity.schema, snapshot: entity.getSnapshot() };
	`);
}

/** Fetches `{ [collectionName]: primaryKeyFieldName }` from the live client schema. */
export async function fetchCollectionPrimaryKeys(): Promise<Record<
	string,
	string
> | null> {
	return evalAsync<Record<string, string> | null>(`
		var client = window.__VERDANT_CLIENT__;
		if (!client || !client.schema) return null;
		var result = {};
		for (var entry of Object.entries(client.schema.collections)) {
			result[entry[0]] = entry[1].primaryKey;
		}
		return result;
	`);
}

/** Sets a single field/key/index on the container entity at `path`. */
export async function setEntityField(
	collection: string,
	primaryKey: unknown,
	path: EntityPath,
	key: string | number,
	value: unknown,
): Promise<void> {
	await evalAsync(`
		${navigatePreamble(collection, primaryKey, path)}
		entity.set(${JSON.stringify(key)}, ${JSON.stringify(value)});
		return true;
	`);
}

/** Deletes a single field/key/index from the container entity at `path`. */
export async function deleteEntityField(
	collection: string,
	primaryKey: unknown,
	path: EntityPath,
	key: string | number,
): Promise<void> {
	await evalAsync(`
		${navigatePreamble(collection, primaryKey, path)}
		entity.delete(${JSON.stringify(key)});
		return true;
	`);
}

/** Pushes a new item onto the list entity at `path`. */
export async function pushEntityItem(
	collection: string,
	primaryKey: unknown,
	path: EntityPath,
	value: unknown,
): Promise<void> {
	await evalAsync(`
		${navigatePreamble(collection, primaryKey, path)}
		entity.push(${JSON.stringify(value)});
		return true;
	`);
}

/** Deletes an entire document from its collection. */
export async function deleteDocument(
	collection: string,
	primaryKey: unknown,
): Promise<void> {
	await evalAsync(`
		var client = window.__VERDANT_CLIENT__;
		if (!client) throw new Error('No Verdant client found on the inspected page.');
		var col = client[${JSON.stringify(collection)}];
		if (!col) throw new Error(${JSON.stringify(`Unknown collection: ${collection}`)});
		await col.delete(${JSON.stringify(primaryKey)});
		return true;
	`);
}
