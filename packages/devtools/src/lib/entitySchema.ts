import type { StorageFieldSchema } from '@verdant-web/common';

export type EntityPathSegment = string | number;
export type EntityPath = EntityPathSegment[];

export type ContainerKind = 'object' | 'array' | 'map' | 'any';

/**
 * Given the schema of a container entity (object/array/map/any) and a
 * child key/index within it, returns the child's own field schema, if
 * knowable. `null` means "no schema constraint" (e.g. inside an `any`
 * field), and callers should fall back to unconstrained JSON editing.
 */
export function getChildSchema(
	containerSchema: StorageFieldSchema,
	key: EntityPathSegment,
): StorageFieldSchema | null {
	if (containerSchema.type === 'object') {
		return containerSchema.properties[key as string] ?? null;
	}
	if (containerSchema.type === 'array') {
		return containerSchema.items;
	}
	if (containerSchema.type === 'map') {
		return containerSchema.values;
	}
	// 'any' (or anything else) - no schema constraint
	return null;
}

/**
 * Mirrors the store's own entity delete-mode logic (see
 * `Entity#getDeleteMode`): any/map contents are always removable, object
 * properties are removable if nullable or typed `any`, list items are
 * always removable, and everything else is not.
 */
export function isChildDeletable(
	containerKind: ContainerKind,
	childSchema: StorageFieldSchema | null,
): boolean {
	if (containerKind === 'any' || containerKind === 'map') return true;
	if (containerKind === 'array') return true;
	if (containerKind === 'object') {
		if (!childSchema) return true;
		if (childSchema.type === 'any') return true;
		if (childSchema.type === 'map') return false;
		return !!childSchema.nullable;
	}
	return false;
}

/** Whether a value of this schema (or lack thereof) should open a nested
 * editor dialog rather than being edited inline. */
export function isContainerSchema(
	schema: StorageFieldSchema | null,
): schema is StorageFieldSchema & {
	type: 'object' | 'array' | 'map';
} {
	return (
		!!schema &&
		(schema.type === 'object' || schema.type === 'array' || schema.type === 'map')
	);
}

/** Runtime fallback for values with no schema constraint (inside `any`). */
export function isContainerValue(value: unknown): value is object {
	return typeof value === 'object' && value !== null;
}

export function containerKindOf(
	schema: StorageFieldSchema | null,
): ContainerKind {
	if (!schema) return 'any';
	if (schema.type === 'object') return 'object';
	if (schema.type === 'array') return 'array';
	if (schema.type === 'map') return 'map';
	return 'any';
}

/** A reasonable default value to seed a newly-added field/item with. */
export function defaultValueForSchema(
	schema: StorageFieldSchema | null,
): unknown {
	if (!schema) return null;
	switch (schema.type) {
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'array':
			return [];
		case 'object':
			return {};
		case 'map':
			return {};
		case 'any':
			return null;
		case 'file':
			return null;
		default:
			return null;
	}
}
