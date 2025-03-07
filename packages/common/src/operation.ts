import { DocumentBaseline } from './baseline.js';
import { FileRef, isFileRef } from './files.js';
import {
	assignOid,
	assignOidsToAllSubObjects,
	getOid,
	getOidRoot,
	maybeGetOid,
	normalize,
	ObjectIdentifier,
	removeOid,
} from './oids.js';
import { compareRefs, isRef } from './refs.js';
import { assert, cloneDeep, findLastIndex, isObject } from './utils.js';

// export type ObjectIdentifier<
// 	CollectionName extends string = string,
// 	DocumentId extends string = string,
// 	DocumentOid extends string = string,
// > =
// 	| `${CollectionName}/${DocumentId}:${DocumentOid}`
// 	| `${CollectionName}/${DocumentId}:${DocumentOid}#${string}`;

export type ObjectRef = {
	'@@type': 'ref';
	id: ObjectIdentifier;
};

export function isObjectRef(obj: any): obj is ObjectRef {
	return obj && typeof obj === 'object' && obj['@@type'] === 'ref';
}

export type Normalized<T> = {
	[key in keyof T]: T[key] extends Object ? ObjectRef : T[key];
};

// patches v2

export type PropertyName = string | number;
/**
 * List patches can target a particular child list or
 * nested lists. The first path item is the property path
 * of the first child list, any subsequent values are nested
 * list indices.
 */
export type PropertyValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| ObjectRef
	| FileRef;

// all patches refer to a specific sub-object.
interface BaseOperationPatch {}

export interface OperationPatchInitialize extends BaseOperationPatch {
	op: 'initialize';
	value: any;
}
export interface OperationPatchSet extends BaseOperationPatch {
	op: 'set';
	name: PropertyName;
	value: PropertyValue;
}
export interface OperationPatchRemove extends BaseOperationPatch {
	op: 'remove';
	name: PropertyName;
}
export interface OperationPatchListSet extends BaseOperationPatch {
	op: 'list-set';
	index: number;
	value: PropertyValue;
}
export interface OperationPatchListPush extends BaseOperationPatch {
	op: 'list-push';
	value: PropertyValue;
}
export interface OperationPatchListInsert extends BaseOperationPatch {
	op: 'list-insert';
	index: number;
	value?: PropertyValue;
	values?: PropertyValue[];
}
export interface OperationPatchListDelete extends BaseOperationPatch {
	op: 'list-delete';
	index: number;
	count: number;
}
/**
 * Optimal for lists of object references. Moves
 * the selected item to the target index even if it
 * is not at the original index anymore.
 */
export interface OperationPatchListMoveByRef extends BaseOperationPatch {
	op: 'list-move-by-ref';
	value: ObjectRef | FileRef;
	index: number;
}
/**
 * Suitable for any list move, whether object lists
 * or primitive lists.
 */
export interface OperationPatchListMoveByIndex extends BaseOperationPatch {
	op: 'list-move-by-index';
	from: number;
	to: number;
}
/**
 * Removes all instances of the value from
 * the list. Good for set behavior or removing
 * a specific item even if it changes index
 * from conflicts.
 */
export interface OperationPatchListRemove extends BaseOperationPatch {
	op: 'list-remove';
	value: PropertyValue;
	only?: 'first' | 'last';
}

export interface OperationPatchListAdd extends BaseOperationPatch {
	op: 'list-add';
	value: PropertyValue;
}

export interface OperationPatchDelete extends BaseOperationPatch {
	op: 'delete';
}

export interface OperationPatchTouch extends BaseOperationPatch {
	op: 'touch';
}

export type OperationPatch =
	| OperationPatchInitialize
	| OperationPatchSet
	| OperationPatchRemove
	| OperationPatchListSet
	| OperationPatchListPush
	| OperationPatchListInsert
	| OperationPatchListDelete
	| OperationPatchListMoveByRef
	| OperationPatchListMoveByIndex
	| OperationPatchListRemove
	| OperationPatchDelete
	| OperationPatchListAdd
	| OperationPatchTouch;

export type Operation = {
	oid: ObjectIdentifier;
	timestamp: string;
	data: OperationPatch;
	authz?: string;
};

/**
 * Takes a basic object and constructs a patch list to create it and
 * all of its nested objects.
 */
export function initialToPatches(
	initial: any,
	rootOid: ObjectIdentifier,
	getNow: () => string,
	createSubId?: () => string,
	patches: Operation[] = [],
	options?: { authz?: string },
) {
	assignOid(initial, rootOid);
	assignOidsToAllSubObjects(initial, createSubId);
	const normalized = normalize(initial);
	for (const key of normalized.keys()) {
		const value = normalized.get(key);
		const op: Operation = {
			oid: key,
			timestamp: getNow(),
			data: {
				op: 'initialize',
				value: removeOid(value),
			},
		};
		patches.push(addAuthzToOp(op, options?.authz));
	}
	return patches;
}

export function shallowInitialToPatches(
	initial: any,
	rootOid: ObjectIdentifier,
	getNow: () => string,
	patches: Operation[] = [],
	options?: { authz?: string },
) {
	const op: Operation = {
		oid: rootOid,
		timestamp: getNow(),
		data: {
			op: 'initialize',
			value: initial,
		},
	};
	patches.push(addAuthzToOp(op, options?.authz));
	return patches;
}

// saves a bit of network traffic by not attaching authz
// key at all if not present
export function addAuthzToOp(op: Operation, authz?: string) {
	if (authz) {
		op.authz = authz;
	}
	return op;
}

export function groupPatchesByOid(patches: Operation[]) {
	const grouped: Record<ObjectIdentifier, Operation[]> = {};
	for (const patch of patches) {
		if (patch.oid in grouped) {
			grouped[patch.oid].push(patch);
		} else {
			grouped[patch.oid] = [patch];
		}
	}
	return grouped;
}

export function groupPatchesByRootOid(patches: Operation[]) {
	const grouped: Record<ObjectIdentifier, Operation[]> = {};
	for (const patch of patches) {
		const root = getOidRoot(patch.oid);
		if (root in grouped) {
			grouped[root].push(patch);
		} else {
			grouped[root] = [patch];
		}
	}
	return grouped;
}

export function groupBaselinesByRootOid(baselines: DocumentBaseline[]) {
	const grouped: Record<ObjectIdentifier, DocumentBaseline[]> = {};
	for (const patch of baselines) {
		const root = getOidRoot(patch.oid);
		if (root in grouped) {
			grouped[root].push(patch);
		} else {
			grouped[root] = [patch];
		}
	}
	return grouped;
}

export type NormalizedObject =
	| {
			[key: PropertyName]: PropertyValue;
	  }
	| Array<PropertyValue>;

function listCheck(obj: any): obj is Array<unknown> {
	if (!Array.isArray(obj)) {
		console.error(
			`Cannot apply list patch; expected array, received ${JSON.stringify(
				obj,
			)}. This suggests your data is changing from a list to an object over time. (OID: ${maybeGetOid(
				obj,
			)})`,
		);
		return false;
	} else {
		return true;
	}
}

/**
 * The incoming object should already be normalized!
 * This function will mutate the base object.
 */
export function applyPatch<T extends NormalizedObject>(
	base: T | undefined,
	patch: OperationPatch,
	/**
	 * Optionally supply a list to which any refs which
	 * are removed during the patch will be appended.
	 */
	deletedRefs?: (FileRef | ObjectRef)[],
): T | undefined {
	// deleted objects are represented by undefined
	// and remain deleted unless re-initialized
	if ((base === undefined || base === null) && patch.op !== 'initialize') {
		return base;
	}
	// ditch typing internally.
	const baseAsAny = base as any;
	let index;
	let spliceResult: any[];

	// a helper, pass it a value which is about
	// to be removed and it will append it to the list
	// if it was a ref
	function checkRef(field: any) {
		// don't bother if not supplied
		if (!deletedRefs) return;
		if (isRef(field)) {
			deletedRefs.push(field);
		}
	}

	switch (patch.op) {
		case 'set':
			checkRef(baseAsAny[patch.name]);
			baseAsAny[patch.name] = patch.value;
			break;
		case 'remove':
			checkRef(baseAsAny[patch.name]);
			delete baseAsAny[patch.name];
			break;
		case 'list-set':
			if (listCheck(base)) {
				checkRef(base[patch.index]);
				base[patch.index] = patch.value;
			}
			break;
		case 'list-push':
			if (listCheck(base)) {
				base.push(patch.value);
			}
			break;
		case 'list-delete':
			if (listCheck(base)) {
				checkRef(base[patch.index]);
				base.splice(patch.index, patch.count);
			}
			break;
		case 'list-move-by-index':
			if (listCheck(base)) {
				spliceResult = base.splice(patch.from, 1);
				base.splice(patch.to, 0, spliceResult[0]);
			}
			break;
		case 'list-remove':
			if (listCheck(base)) {
				do {
					const valueToRemove = patch.value;
					if (patch.only === 'last') {
						if (isObjectRef(valueToRemove)) {
							index = findLastIndex(
								base,
								(item: any) => item.id === valueToRemove.id,
							);
						} else {
							index = base.lastIndexOf(valueToRemove);
						}
					} else {
						if (isObjectRef(valueToRemove)) {
							index = base.findIndex(
								(item: any) => item.id === valueToRemove.id,
							);
						} else {
							index = base.indexOf(valueToRemove);
						}
					}
					if (index !== -1) {
						checkRef(base[index]);
						base.splice(index, 1);
					}
				} while (!patch.only && index !== -1);
			}
			break;
		case 'list-add':
			if (listCheck(base)) {
				const alreadyHas = base.some((item: any) => {
					if (isObjectRef(item) && isObjectRef(patch.value)) {
						return item.id === patch.value.id;
					} else {
						return item === patch.value;
					}
				});
				if (!alreadyHas) {
					base.push(patch.value);
				}
			}
			break;
		case 'list-move-by-ref':
			if (listCheck(base)) {
				index = base.findIndex((v) => compareRefs(v, patch.value));
				spliceResult = base.splice(index, 1);
				base.splice(patch.index, 0, spliceResult[0]);
			}
			break;
		case 'list-insert':
			if (listCheck(base)) {
				if (!patch.value && !patch.values) {
					throw new Error(
						`Cannot apply list insert patch; expected value or values, received ${JSON.stringify(
							patch,
						)}`,
					);
				}
				if (patch.value) {
					base.splice(patch.index, 0, patch.value);
				} else {
					base.splice(patch.index, 0, ...patch.values!);
				}
			}
			break;
		case 'delete':
			// collect all refs that are deleted
			if (Array.isArray(base)) {
				base.forEach(checkRef);
			} else if (isObject(base)) {
				Object.values(base || {}).forEach(checkRef);
			}
			return undefined;
		case 'initialize':
			return cloneDeep(patch.value);
		case 'touch':
			// no-op
			return base;
		default:
			throw new Error(`Unsupported patch operation: ${(patch as any).op}`);
	}
	return base;
}

export function applyOperations<T extends NormalizedObject>(
	base: T | undefined,
	operations: Operation[],
	deletedRefs?: (ObjectRef | FileRef)[],
	/**
	 * Provide and it will be assigned any authz info assigned
	 * in applied operations
	 */
	authzRef?: { authz?: string },
): T | undefined {
	let cur = base as T | undefined;
	for (const op of operations) {
		cur = applyPatch(cur, op.data, deletedRefs);
		if (authzRef && op.data.op === 'initialize' && op.authz) {
			authzRef.authz = op.authz;
		}
	}
	return cur;
}

/**
 * Mutates the original object in place. Returns all referenced
 * objects oids.
 */
export function substituteRefsWithObjects(
	base: any,
	refs: Map<ObjectIdentifier, any>,
	used: ObjectIdentifier[] = [],
): ObjectIdentifier[] {
	if (Array.isArray(base)) {
		for (let i = 0; i < base.length; i++) {
			const item = base[i];
			base[i] = dereference(item, refs, used);
			if (isObject(base[i])) {
				substituteRefsWithObjects(base[i], refs, used);
			}
		}
	} else if (isFileRef(base)) {
		// don't do anything with file refs
	} else if (isObject(base)) {
		// not sure where to put this assertion but it's important to make
		// sure all nested objects include an OID
		assert(
			maybeGetOid(base),
			`Object ${JSON.stringify(base)} must have an oid`,
		);
		for (const key of Object.keys(base)) {
			base[key] = dereference(base[key], refs, used);

			// now that objects are in place, recursively substitute
			if (isObject(base[key])) {
				substituteRefsWithObjects(base[key], refs, used);
			}
		}
	}

	return used;
}

function dereference(
	input: any,
	refs: Map<ObjectIdentifier, any>,
	used: ObjectIdentifier[],
): any {
	if (isObjectRef(input)) {
		used.push(input.id);
		const resolved = refs.get(input.id);
		assert(!!resolved, `No value was found in object map for ${input.id}`);
		return assignOid(resolved, input.id);
	} else {
		return input;
	}
}

export function substituteFirstLevelObjectsWithRefs<
	Base extends { [key: string]: any } | any[],
>(
	base: Base,
	refObjects: Map<ObjectIdentifier, any> = new Map(),
): Map<ObjectIdentifier, any> {
	if (Array.isArray(base)) {
		for (let i = 0; i < base.length; i++) {
			const item = base[i];
			// special handling of file refs, which are treated like primitives
			if (isFileRef(item)) {
				continue;
			}
			assert(
				!isRef(item),
				'An object with refs was passed to substituteFirstLevelObjectsWithRefs, this is not allowed',
			);
			if (isObject(item)) {
				const oid = getOid(item);
				base[i] = {
					'@@type': 'ref',
					id: oid,
				};
				refObjects.set(oid, item);
			}
		}
	} else {
		for (const [key, value] of Object.entries(base)) {
			// special handling of file refs, which are treated like primitives
			if (isFileRef(value)) {
				continue;
			}
			assert(
				!isRef(value),
				'An object with refs was passed to substituteFirstLevelObjectsWithRefs, this is not allowed',
			);
			if (isObject(value)) {
				base[key] = {
					'@@type': 'ref',
					id: getOid(value),
				};

				refObjects.set(getOid(value), value);
			}
		}
	}

	return refObjects;
}

/**
 * Takes a snapshot with applied OIDs and deconstructs it entirely
 * into individual objects with ref fields. Populates the supplied
 * map with the final objects.
 */
export function deconstructSnapshotToRefs(
	snapshot: any,
	refTargets: Map<ObjectIdentifier, any>,
) {
	if (typeof snapshot !== 'object') {
		return;
	}
	refTargets.set(getOid(snapshot), snapshot);
	const thisLevelOfTargets = substituteFirstLevelObjectsWithRefs(snapshot);
	for (const [oid, obj] of thisLevelOfTargets.entries()) {
		refTargets.set(oid, obj);
		deconstructSnapshotToRefs(obj, refTargets);
	}
}

export function operationSupersedes(op: Operation): PropertyName | boolean {
	// todo: add 'remove'
	if (op.data.op === 'set') {
		return op.data.name;
	}

	return false;
}

/**
 * Determine if an operation is superseded by a set of supersession values
 * provided by operationSupersedes. Assumes the operation OID matches
 * already.
 */
export function isSuperseded(
	op: Operation,
	supersession: Set<PropertyName | boolean>,
) {
	if (supersession.has(true)) {
		return true;
	} else if (op.data.op === 'set' || op.data.op === 'remove') {
		return supersession.has(op.data.name);
	}

	return false;
}

/**
 * Allocates a copy with only valid keys for transmitting over
 * the protocol. TODO: make this unnecessary or evaluate if it's
 * worth it to do.
 */
export function pickValidOperationKeys(operation: Operation): Operation {
	return {
		oid: operation.oid,
		timestamp: operation.timestamp,
		data: operation.data,
		authz: operation.authz,
	};
}
