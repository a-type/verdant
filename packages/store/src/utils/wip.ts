import { hashObject, StorageSchema } from '@verdant-web/common';

export function getWipNamespace(namespace: string, schema: StorageSchema) {
	return `@@wip_${namespace}_${hashObject(schema)}`;
}
