import { hashObject, StorageSchema } from '@verdant-web/common';

export function getWipNamespace(namespace: string, schema: StorageSchema) {
	return `@@wip-${namespace}-${hashObject(schema)}`;
}
