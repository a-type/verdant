export const OPERATION_INDEX_NAMES = {
	IS_LOCAL__TIMESTAMP: 'l_t',
	ROOT_OID__TIMESTAMP: 'd_t',
	OID__TIMESTAMP: 'oid_timestamp', // never got migrated to o_t because it's the primary key
} as const;
