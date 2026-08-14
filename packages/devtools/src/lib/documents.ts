const PRIMARY_KEY_CANDIDATES = ['id', 'key', 'uuid', 'primaryKey'];

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}

/**
 * A query result is treated as a "document list" when it's an array whose
 * entries are all plain objects (i.e. entity snapshots).
 */
export function isDocumentList(value: unknown): value is Record<string, unknown>[] {
	return Array.isArray(value) && value.every(isPlainObject);
}

/**
 * Best-effort guess at which field on a document snapshot is its primary
 * key. Devtools doesn't have access to the schema, so this falls back to
 * common naming conventions, then the first field in the object.
 */
export function guessPrimaryKeyField(doc: Record<string, unknown>): string | null {
	for (const candidate of PRIMARY_KEY_CANDIDATES) {
		if (candidate in doc) return candidate;
	}
	const [firstKey] = Object.keys(doc);
	return firstKey ?? null;
}

export function guessPrimaryKeyValue(doc: Record<string, unknown>): unknown {
	const field = guessPrimaryKeyField(doc);
	return field ? doc[field] : undefined;
}
