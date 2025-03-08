import { v4 } from 'uuid';
import { isFileRef } from './files.js';
import { isObjectRef, ObjectRef } from './operation.js';
import { isRef } from './refs.js';
import { assert, isObject } from './utils.js';

/**
 * OIDs
 *
 * OIDs are used to identify objects in the document. They also encode
 * information about the object useful to identifying an object found
 * on its own and associating it back to its parent.
 *
 * An OID is structured as such:
 * <collection>/<root id>:<random>
 *
 * OIDs have a few characteristics:
 * - They include the collection name of the parent document
 * - They include the primary key of the parent document
 * - They may include a random sequence to identify sub-objects
 *
 * Collection name and document key are used to link any isolated
 * object back to its parent document.
 *
 * The random sequence allows the application to encode different
 * identities for objects at the same position in a document for
 * conflict resolution purposes
 */

export type ObjectIdentifier = string;

const SEGMENT_SEPARATOR = '/';
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
	return oidMap.get(obj);
}

export function assignOid(obj: any, oid: ObjectIdentifier) {
	assert(
		isObject(obj),
		`Only objects can be assigned OIDs, received ${JSON.stringify(obj)}`,
	);
	if (hasOid(obj)) {
		removeOid(obj);
	}
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

export function ensureCompatibleOid(
	obj: any,
	rootOid: ObjectIdentifier,
	createSubId?: () => string,
) {
	if (!hasOid(obj)) {
		const oid = createSubOid(rootOid, createSubId);
		assignOid(obj, oid);
		return oid;
	} else {
		const existingOid = getOid(obj);
		if (!areOidsRelated(existingOid, rootOid)) {
			const oid = createSubOid(rootOid, createSubId);
			assignOid(obj, oid);
			return oid;
		} else {
			return getOid(obj);
		}
	}
}

const SANITIZE_PLACEHOLDERS = {
	'.': '&dot;',
	'/': '&slash;',
	':': '&colon;',
};
function sanitizeFragment(id: string) {
	// replaces separator characters with placeholders
	return id
		.replace(/[/]/g, SANITIZE_PLACEHOLDERS['/'])
		.replace(/[:]/g, SANITIZE_PLACEHOLDERS[':'])
		.replace(/[.]/g, SANITIZE_PLACEHOLDERS['.']);
}
function unsanitizeFragment(id: string) {
	// replaces placeholders with separator characters
	return id
		.replace(/&slash;/g, '/')
		.replace(/&colon;/g, ':')
		.replace(/&dot;/g, '.');
}

/**
 * Creates an OID for the document with a particular ID.
 * To create a sub-object OID, use createSubOid and pass
 * the root OID.
 */
export function createOid(
	collection: string,
	documentId: string,
	subId?: string,
) {
	let oid =
		sanitizeFragment(collection) +
		SEGMENT_SEPARATOR +
		sanitizeFragment(documentId);
	if (subId) {
		oid += RANDOM_SEPARATOR + subId;
	}
	return oid;
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
	let [collection, coreId, ...others] = oid.split('/');
	// if 'others' exists, something's off, but maybe we can recover...
	// by assuming the last segment is the authz and bolting the rest onto coreId
	if (others.length) {
		console.error(
			`OID ${oid} has more than 3 segments. Attempting to parse it anyway.`,
		);
		coreId += '/' + others.join('/');
	}

	const [idOrLegacyPathId, random] = coreId.split(RANDOM_SEPARATOR);

	let id;
	// legacy path handling. shouldn't be necessary anymore.
	if (idOrLegacyPathId.includes('.')) {
		id = idOrLegacyPathId.slice(0, idOrLegacyPathId.indexOf('.'));
	} else {
		id = idOrLegacyPathId;
	}

	return {
		collection: unsanitizeFragment(collection),
		id: unsanitizeFragment(id),
		subId: random,
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
				ensureCompatibleOid(item, rootOid, createSubId);
				assignOidsToAllSubObjects(item, createSubId);
			}
		}
	} else if (isObject(obj) && !isRef(obj)) {
		for (const key of Object.keys(obj)) {
			if (isObject(obj[key]) && !isRef(obj[key])) {
				ensureCompatibleOid(obj[key], rootOid, createSubId);
				assignOidsToAllSubObjects(obj[key], createSubId);
			}
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
						'An attempt was made to normalize an already normalized object! This is an error in verdant itself.',
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
						'An attempt was made to normalize an already normalized object! This is an error in verdant itself.',
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
	return oid.split('.')[0].split(RANDOM_SEPARATOR)[0];
}

/**
 * Returns an inclusive range of OIDs that represent
 * all of an OID's possible sub-objects.
 */
export function getOidSubIdRange(oid: ObjectIdentifier) {
	const root = getOidRoot(oid);
	const lastSubId = createSubOid(root, () => '\uffff');
	return [`${root}${RANDOM_SEPARATOR}`, lastSubId];
}

export function getRoots(oids: ObjectIdentifier[]) {
	const set = new Set<ObjectIdentifier>();
	for (const oid of oids) {
		set.add(getOidRoot(oid));
	}
	return Array.from(set);
}

export function areOidsRelated(oidA: ObjectIdentifier, oidB: ObjectIdentifier) {
	return getOidRoot(oidA) === getOidRoot(oidB);
}

export function isRootOid(oid: ObjectIdentifier) {
	return !oid.includes(RANDOM_SEPARATOR);
}

/**
 * Recursively rewrites any OIDs in an object which are 'foreign' -
 * i.e. relate to some other object/entity - to be local to the
 * current object. This is deterministic, so it can be done
 * on multiple clients independently with predictable results.
 */
export function fixForeignOids(obj: any) {
	const oid = maybeGetOid(obj);
	if (!oid) return;

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			migrateForeignOid(oid, obj[i]);
			fixForeignOids(obj[i]);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			migrateForeignOid(oid, obj[key]);
			fixForeignOids(obj[key]);
		}
	}
}

function migrateForeignOid(parentOid: ObjectIdentifier, child: any) {
	const childOid = maybeGetOid(child);
	if (childOid && !areOidsRelated(parentOid, childOid)) {
		const { subId, id } = decomposeOid(childOid);
		// reuse existing subId. if child is a foreign root, use its id as subId
		assignOid(
			child,
			createSubOid(parentOid, () => subId || id),
		);
	}
}

/**
 * Returns a list of all OIDs assigned to this object
 * and all sub-objects.
 */
export function getAllOids(root: any) {
	const oids = new Set<ObjectIdentifier>();
	const stack = [root];
	while (stack.length) {
		const obj = stack.pop();
		const oid = maybeGetOid(obj);
		if (oid) {
			oids.add(oid);
		}
		if (Array.isArray(obj)) {
			stack.push(...obj);
		} else if (isObject(obj)) {
			stack.push(...Object.values(obj));
		}
	}
	return Array.from(oids);
}
