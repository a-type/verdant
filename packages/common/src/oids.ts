import { assert } from '@aglio/tools';
import { v4 } from 'uuid';
import { ObjectRef } from './operation.js';
import { isObject } from './utils.js';

export type ObjectIdentifier = string;

const OID_KEY = '__@@oid_do_not_use';

export function getOid(obj: any) {
	const oid = maybeGetOid(obj);
	assert(
		!!oid,
		`Object ${JSON.stringify(obj)} does not have an OID assigned to it`,
	);
	return oid;
}

export function maybeGetOid(obj: any): ObjectIdentifier | undefined {
	if (!isObject(obj)) {
		return undefined;
	}
	return obj[OID_KEY];
}

export function assignOid(obj: any, oid: ObjectIdentifier) {
	assert(
		isObject(obj),
		`Only objects can be assigned OIDs, received ${JSON.stringify(obj)}`,
	);
	obj[OID_KEY] = oid;
	return obj;
}

export function hasOid(obj: any) {
	return !!maybeGetOid(obj);
}

export function removeOid(obj: any) {
	delete obj[OID_KEY];
	return obj;
}

/**
 * For sub-objects, assign a random sub-OID if no OID
 * is already assigned.
 */
export function ensureOid(
	obj: any,
	rootOid: ObjectIdentifier,
	createSubId?: () => string,
) {
	if (!hasOid(obj)) {
		const oid = createSubOid(rootOid, createSubId);
		assignOid(obj, oid);
		return oid;
	} else {
		return getOid(obj);
	}
}

export function createOid(
	collection: string,
	documentId: string,
	subId?: string,
) {
	if (subId) {
		return `${collection}/${documentId}:${subId}`;
	}
	return `${collection}/${documentId}`;
}

export function createSubOid(
	root: ObjectIdentifier,
	createSubId: () => string = createOidSubId,
) {
	const { collection, id } = decomposeOid(root);
	return createOid(collection, id, createSubId());
}

export function decomposeOid(oid: ObjectIdentifier): {
	collection: string;
	id: string;
	subId?: string;
} {
	const [collection, documentId] = oid.split('/');
	const [id, subId] = documentId.split(':');
	return { collection, id, subId };
}

export function assertAllLevelsHaveOids(obj: any, root?: any) {
	assert(
		getOid(obj),
		`Object ${JSON.stringify(obj)} must have an oid (child of ${JSON.stringify(
			root,
		)})`,
	);
	if (Array.isArray(obj)) {
		for (const item of obj) {
			assertAllLevelsHaveOids(item, root || obj);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			assertAllLevelsHaveOids(obj[key], root || obj);
		}
	}
}

export function assignOidsToAllSubObjects(
	obj: any,
	createSubId?: () => string,
) {
	const rootOid = getOid(obj);
	if (Array.isArray(obj)) {
		for (const item of obj) {
			if (isObject(item)) {
				ensureOid(item, rootOid, createSubId);
				assignOidsToAllSubObjects(item, createSubId);
			}
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			if (isObject(obj[key])) {
				ensureOid(obj[key], rootOid, createSubId);
				assignOidsToAllSubObjects(obj[key], createSubId);
			}
		}
	}
}

export function createOidSubId() {
	return v4().slice(0, 8);
}

export function createRef(oid: ObjectIdentifier): ObjectRef {
	return {
		'@@type': 'ref',
		id: oid,
	};
}

export function normalize(
	obj: any,
	refs: Map<ObjectIdentifier, any> = new Map(),
): Map<ObjectIdentifier, any> {
	if (Array.isArray(obj)) {
		const oid = getOid(obj);
		const copy = assignOid([], oid);
		for (let i = 0; i < obj.length; i++) {
			const value = obj[i];
			if (isObject(value)) {
				const itemOid = getOid(value);
				copy[i] = createRef(itemOid);
				normalize(value, refs);
			} else {
				copy[i] = value;
			}
		}
		refs.set(oid, copy);
	} else if (isObject(obj)) {
		const oid = getOid(obj);
		const copy = assignOid({} as Record<string, any>, oid);
		for (const key of Object.keys(obj)) {
			const value = obj[key];
			if (isObject(value)) {
				const itemOid = getOid(value);
				copy[key] = createRef(itemOid);
				normalize(value, refs);
			} else {
				copy[key] = value;
			}
		}
		refs.set(oid, copy);
	}
	return refs;
}

/**
 * Only normalizes direct children. The created map
 * of objects will still have nested objects.
 */
export function normalizeFirstLevel(
	obj: any,
	refs: Map<ObjectIdentifier, any> = new Map(),
): Map<ObjectIdentifier, any> {
	if (Array.isArray(obj)) {
		const oid = getOid(obj);
		const copy = assignOid([], oid);
		for (let i = 0; i < obj.length; i++) {
			const value = obj[i];
			if (isObject(value)) {
				const itemOid = getOid(value);
				copy[i] = createRef(itemOid);
				refs.set(itemOid, value);
			} else {
				copy[i] = value;
			}
		}
		refs.set(oid, copy);
	} else if (isObject(obj)) {
		const oid = getOid(obj);
		const copy = assignOid({} as Record<string, any>, oid);
		for (const key of Object.keys(obj)) {
			const value = obj[key];
			if (isObject(value)) {
				const itemOid = getOid(value);
				copy[key] = createRef(itemOid);
				refs.set(itemOid, value);
			} else {
				copy[key] = value;
			}
		}
		refs.set(oid, copy);
	}
	return refs;
}

export function getOidRoot(oid: ObjectIdentifier) {
	const [root] = oid.split(':');
	return root;
}

/**
 * Returns an inclusive range of OIDs that represent
 * a root object and all of its sub-objects.
 */
export function getOidRange(oid: ObjectIdentifier) {
	const root = getOidRoot(oid);
	return [root, `${root}:\uffff`];
}

export function getRoots(oids: ObjectIdentifier[]) {
	const set = new Set<ObjectIdentifier>();
	for (const oid of oids) {
		set.add(getOidRoot(oid));
	}
	return Array.from(set);
}
