import { v4 } from 'uuid';
import { isFileRef } from './files.js';
import { isObjectRef, ObjectRef } from './operation.js';
import { isRef } from './refs.js';
import { isObject, assert } from './utils.js';

/**
 * OIDs
 *
 * OIDs are used to identify objects in the document. They also encode
 * information about the object useful to identifying an object found
 * on its own and associating it back to its parent.
 *
 * An OID is structured as such:
 * <collection>/<root id>[/<key paths>]:<random>
 *
 * OIDs have a few characteristics:
 * - They include the collection name of the parent document
 * - They include the primary key of the parent document
 * - They include the key path of the object within the document
 * - They include a random sequence to identify different objects which
 *   exist at the same key path
 *
 * Collection name and document key are used to link any isolated
 * object back to its parent document.
 *
 * The key path is used for authorization - to associate the object
 * (or an operation related to it by OID) with the field it inhabits
 * to utilize authorization rules from that field in the schema.
 *
 * The random sequence allows the application to encode different
 * identities for objects at the same position in a document for
 * conflict resolution purposes
 */

export type ObjectIdentifier = string;
export type KeyPath = (string | number)[];

export const LEGACY_OID_KEY = '__@@oid_do_not_use';
export const OID_KEY = '@@id';

const KEY_PATH_SEPARATOR = '.';
const COLLECTION_SEPARATOR = '/';
const RANDOM_SEPARATOR = ':';

/**
 * This is the global, in-memory storage for all OIDs. It is used to
 * associate JS objects with OIDs without modifying the objects themselves.
 */
const oidMap = new WeakMap<any, ObjectIdentifier>();

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
	return oidMap.get(obj) ?? obj[OID_KEY] ?? obj[LEGACY_OID_KEY];
}

export function assignOid(obj: any, oid: ObjectIdentifier) {
	assert(
		isObject(obj),
		`Only objects can be assigned OIDs, received ${JSON.stringify(obj)}`,
	);
	oidMap.set(obj, oid);
	return obj;
}

export function hasOid(obj: any) {
	return !!maybeGetOid(obj);
}

export function removeOid(obj: any) {
	oidMap.delete(obj);
	return obj;
}

export function isOidKey(key: string) {
	return key === OID_KEY || key === LEGACY_OID_KEY;
}

/**
 * For sub-objects, assign a random sub-OID if no OID
 * is already assigned.
 */
export function ensureOid(
	obj: any,
	rootOid: ObjectIdentifier,
	key: string | number,
	createSubId?: () => string,
) {
	if (!hasOid(obj)) {
		const oid = createSubOid(rootOid, key, createSubId);
		assignOid(obj, oid);
		return oid;
	} else {
		return getOid(obj);
	}
}

const SANTIIZE_PLACEHOLDERS = {
	'.': '&dot;',
	'/': '&slash;',
	':': '&colon;',
};
function sanitizeFragment(id: string) {
	// replaces separator characters with placeholders
	return id
		.replace(/[/]/g, SANTIIZE_PLACEHOLDERS['/'])
		.replace(/[:]/g, SANTIIZE_PLACEHOLDERS[':'])
		.replace(/[.]/g, SANTIIZE_PLACEHOLDERS['.']);
}
function unsanitizeFragment(id: string) {
	// replaces placeholders with separator characters
	return id
		.replace(/&slash;/g, '/')
		.replace(/&colon;/g, ':')
		.replace(/&dot;/g, '.');
}

export function createOid(
	collection: string,
	documentId: string,
	keyPath: KeyPath,
	subId?: string,
) {
	let oid =
		sanitizeFragment(collection) +
		COLLECTION_SEPARATOR +
		sanitizeFragment(documentId);
	if (subId) {
		const keyPathItems = keyPath.map((k) =>
			typeof k === 'number' ? '#' : sanitizeFragment(k),
		);
		oid += KEY_PATH_SEPARATOR + keyPathItems.join(KEY_PATH_SEPARATOR);
		oid += RANDOM_SEPARATOR + subId;
	}
	return oid;
}

export function createSubOid(
	root: ObjectIdentifier,
	key: string | number,
	createSubId: () => string = createOidSubId,
) {
	const { collection, id, keyPath } = decomposeOid(root);
	return createOid(collection, id, [...keyPath, key], createSubId());
}

export function decomposeOid(oid: ObjectIdentifier): {
	collection: string;
	id: string;
	subId?: string;
	keyPath: KeyPath;
} {
	const [core, random] = oid.split(RANDOM_SEPARATOR);
	const [collection, paths] = core.split('/');
	const [id, ...keyPath] = paths.split(KEY_PATH_SEPARATOR);
	return {
		collection: unsanitizeFragment(collection),
		id: unsanitizeFragment(id),
		subId: random,
		keyPath: keyPath.map(unsanitizeFragment),
	};
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
		let item;
		for (let i = 0; i < obj.length; i++) {
			item = obj[i];
			if (isObject(item) && !isRef(item)) {
				ensureOid(item, rootOid, i, createSubId);
				assignOidsToAllSubObjects(item, createSubId);
			}
		}
	} else if (isObject(obj) && !isRef(obj)) {
		for (const key of Object.keys(obj)) {
			if (isObject(obj[key]) && !isRef(obj[key])) {
				ensureOid(obj[key], rootOid, key, createSubId);
				assignOidsToAllSubObjects(obj[key], createSubId);
			}
		}
	}
}

export function assignOidProperty(obj: any, oid: ObjectIdentifier) {
	assert(
		isObject(obj),
		`Only objects can be assigned OIDs, received ${JSON.stringify(obj)}`,
	);
	obj[OID_KEY] = oid;
	return obj;
}

export function maybeGetOidProperty(obj: any) {
	if (!isObject(obj)) {
		return undefined;
	}
	return obj[OID_KEY] || obj[LEGACY_OID_KEY];
}

function hasOidProperty(obj: any) {
	return !!maybeGetOidProperty(obj);
}

function removeOidProperty(obj: any) {
	if (!isObject(obj)) {
		return obj;
	}
	delete obj[LEGACY_OID_KEY];
	delete obj[OID_KEY];
	return obj;
}

function transferOidFromSystemToProperty(obj: any) {
	const oid = maybeGetOid(obj);
	if (oid) {
		assignOidProperty(obj, oid);
	}
}

/**
 * Assigns a special property to all objects in the given object
 * which have an OID
 */
export function assignOidPropertiesToAllSubObjects(obj: any) {
	transferOidFromSystemToProperty(obj);

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			assignOidPropertiesToAllSubObjects(obj[i]);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			assignOidPropertiesToAllSubObjects(obj[key]);
		}
	}
}

function copyOidFromPropertyToSystem(obj: any) {
	const oid = maybeGetOidProperty(obj);
	if (oid) {
		assignOid(obj, oid);
	}
}

/**
 *
 * Removes the special property from all objects in the given object
 * which have an OID, transferring the OID from the property to the OID
 * system in-memory.
 */
export function removeOidPropertiesFromAllSubObjects(obj: any) {
	copyOidFromPropertyToSystem(obj);
	removeOidProperty(obj);

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			removeOidPropertiesFromAllSubObjects(obj[i]);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			removeOidPropertiesFromAllSubObjects(obj[key]);
		}
	}
}

export function removeOidsFromAllSubObjects(obj: any) {
	removeOid(obj);

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			removeOidsFromAllSubObjects(obj[i]);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			removeOidsFromAllSubObjects(obj[key]);
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
				if (isObjectRef(value)) {
					throw new Error(
						'An attempt was made to normalize an already normalized object! This is an error in lo-fi itself.',
					);
				} else if (isFileRef(value)) {
					copy[i] = value;
					continue;
				} else {
					const itemOid = getOid(value);
					copy[i] = createRef(itemOid);
					normalize(value, refs);
				}
			} else {
				copy[i] = value;
			}
		}
		refs.set(oid, copy);
	} else if (isObject(obj) && !isRef(obj)) {
		const oid = getOid(obj);
		const copy = assignOid({} as Record<string, any>, oid);
		for (const key of Object.keys(obj)) {
			const value = obj[key];
			if (isObject(value)) {
				if (isObjectRef(value)) {
					throw new Error(
						'An attempt was made to normalize an already normalized object! This is an error in lo-fi itself.',
					);
				} else if (isFileRef(value)) {
					// stop here
					copy[key] = value;
				} else {
					const itemOid = getOid(value);
					copy[key] = createRef(itemOid);
					normalize(value, refs);
				}
			} else {
				copy[key] = value;
			}
		}
		refs.set(oid, copy);
	} else if (isRef(obj)) {
	}
	return refs;
}

/**
 * Only normalizes direct children. The created map
 * of objects will still have nested objects.
 */
export function normalizeFirstLevel(obj: any) {
	const refs = new Map<ObjectIdentifier, any>();
	const oidKeyPairs = new Map<ObjectIdentifier, string | number>();
	if (Array.isArray(obj)) {
		const oid = getOid(obj);
		const copy = assignOid([], oid);
		for (let i = 0; i < obj.length; i++) {
			const value = obj[i];
			if (isObject(value)) {
				const itemOid = getOid(value);
				copy[i] = createRef(itemOid);
				refs.set(itemOid, value);
				oidKeyPairs.set(itemOid, i);
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
				oidKeyPairs.set(itemOid, key);
			} else {
				copy[key] = value;
			}
		}
		refs.set(oid, copy);
	}
	return { refs, oidKeyPairs };
}

export function getOidRoot(oid: ObjectIdentifier) {
	const [collection, idAndPaths] = oid.split(RANDOM_SEPARATOR)[0].split('/');
	const sepIdx = idAndPaths.indexOf(KEY_PATH_SEPARATOR);
	const id = sepIdx !== -1 ? idAndPaths.substring(0, sepIdx) : idAndPaths;
	return `${collection}/${id}`;
}

/**
 * Returns an inclusive range of OIDs that represent
 * a root object and all of its sub-objects.
 */
export function getOidRange(oid: ObjectIdentifier) {
	const root = getOidRoot(oid);
	return [root, `${root}${RANDOM_SEPARATOR}\uffff`];
}

export function getRoots(oids: ObjectIdentifier[]) {
	const set = new Set<ObjectIdentifier>();
	for (const oid of oids) {
		set.add(getOidRoot(oid));
	}
	return Array.from(set);
}
