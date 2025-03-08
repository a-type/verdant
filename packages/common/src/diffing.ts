import { VerdantError } from './error.js';
import {
	areOidsRelated,
	assignOid,
	getOid,
	maybeGetOid,
	ObjectIdentifier,
} from './oids.js';
import { isOidKey } from './oidsLegacy.js';
import { Operation } from './operation.js';
import { PatchCreator } from './patch.js';
import { compareRefs, isRef } from './refs.js';
import { cloneDeep, isObject } from './utils.js';

export type DiffContext = {
	patches: Operation[];
	/**
	 * If an object is merged with another and the new one does not
	 * have an OID assigned, assume it is the same identity as previous
	 */
	mergeUnknownObjects?: boolean;
	/**
	 * If an incoming value is not assigned on the new object, use the previous value.
	 * If false, undefined properties will erase the previous value.
	 */
	merge?: boolean;
	/**
	 * Authorization to apply to all created operations
	 */
	authz?: string;
	patchCreator: PatchCreator;
};

/**
 * Compares two anythings and determines if they
 * represent the same thing. Works for primitives,
 * refs, and objects with OIDs.
 */
function areTheSameIdentity(a: any, b: any) {
	if (a === b) return true;
	// special case: Verdant doesn't distinguish nil values in entities
	if ((a === undefined && b === null) || (a === null && b === undefined))
		return true;
	if (isRef(a) && isRef(b)) return compareRefs(a, b);
	const aOid = maybeGetOid(a);
	const bOid = maybeGetOid(b);
	if (aOid && bOid && aOid === bOid) return true;
	return false;
}

/**
 * Enforces OID rules on subobjects being added to an entity.
 * - Every sub-object must have an OID
 * - The sub-object's OID must relate to the parent OID
 */
function enforceAssignedOid(
	parentOid: ObjectIdentifier,
	newObject: any,
	existingObjectOid: ObjectIdentifier | undefined,
	ctx: DiffContext,
) {
	if (!isDiffableObject(newObject)) {
		// nothing to do, the new value cannot have an oid as it is not
		// a sub-object.
		return newObject;
	}

	const oid = maybeGetOid(newObject);
	if (!oid) {
		// if merge unknown objects is enabled, we can assume the new object is the same
		// as the existing object (if present) and use its oid. otherwise we assign a new one.
		if (ctx.mergeUnknownObjects && existingObjectOid) {
			assignOid(newObject, existingObjectOid);
		}
		// NOTE: new OID assignments are done in patchCreator.
	} else if (!areOidsRelated(parentOid, oid)) {
		// when there's any doubt, clone the whole object. false -> do not copy OIDs
		const clone = cloneDeep(newObject, false);
		// NOTE: new OID assignments are done in patchCreator.
		return clone;
	}
	return newObject;
}

function isDiffableObject(val: any) {
	return isObject(val) && !isRef(val);
}

export function diffToPatches(
	from: any,
	to: any,
	getNow: () => string,
	createSubId?: () => string,
	_?: any, // legacy, TODO: remove
	options?: {
		mergeUnknownObjects?: boolean;
		merge?: boolean;
		/** @deprecated - use 'merge' */
		defaultUndefined?: boolean;
		authz?: string;
	},
) {
	const ctx: DiffContext = {
		patches: [],
		mergeUnknownObjects: options?.mergeUnknownObjects,
		merge: options?.merge ?? options?.defaultUndefined,
		authz: options?.authz,
		patchCreator: new PatchCreator(getNow, createSubId),
	};
	diff(from, to, ctx);
	return ctx.patches;
}

export function diff(from: any, to: any, ctx: DiffContext) {
	if (Array.isArray(from) && Array.isArray(to)) {
		diffLists(from, to, ctx);
	} else if (Array.isArray(from) || Array.isArray(to)) {
		throw new VerdantError(
			VerdantError.Code.Unexpected,
			undefined,
			'Cannot diff between array and non-array',
		);
	} else if (isDiffableObject(from) && isDiffableObject(to)) {
		diffObjects(from, to, ctx);
	}
}

/**
 * Deep diff lists of any kind of item. Adds patches for the changes
 * to the context patch list.
 * @param from - the original list snapshot. must be the full snapshot, no references.
 * @param to - the new list snapshot. must be the full snapshot, no references.
 * @param ctx - the diff context to add patches to.
 */
export function diffLists(from: any[], to: any[], ctx: DiffContext) {
	// from object must be registered with an OID.
	const oid = getOid(from);
	// this copy will be mutated to align with inserts, making things easier to compare.
	const fromCopy = [...from];

	// first, normalize incoming data according to OID rules. this is done early
	// so future equality checks are according to configuration like mergeUnknownObjects.
	// for example, if a bare (no oid) object is supplied for an item and mergeUnknownObjects
	// is set, this will assign it the same OID as the existing item at that index, so it will
	// pass equality checks for insertion range, etc.
	for (let i = 0; i < to.length; i++) {
		const value = to[i];
		const oldValue = from[i];
		to[i] = enforceAssignedOid(oid, value, maybeGetOid(oldValue), ctx);
	}

	// track whether the new list has gaps in it. a gap
	// means we can no longer use list-push for new items.
	let noGaps = true;
	for (let i = 0; i < to.length; i++) {
		const value = to[i];
		const oldValue = fromCopy[i];
		if (value === undefined) {
			noGaps = false;
		}

		// we decide if this item is being added to the end of the list if:
		// - there were no empty spaces before it in the new list
		// - the index is beyond the scope of the original list.
		// the second condition is carefully selected since it accounts for
		// the prior list having gaps, too. length should represent the final
		// defined item even if gaps were there previously. we don't want to
		// accidentally 'push' into a gap, which would put the item in the wrong place.
		const isEndOfList = noGaps && i >= fromCopy.length;

		if (isEndOfList) {
			// this will initialize all sub-objects in the item, too
			ctx.patches.push(
				...ctx.patchCreator.createListPush(oid, value, ctx.authz),
			);
		} else if (areTheSameIdentity(value, oldValue)) {
			// the identity of this item hasn't changed, but we
			// still have to diff the contents.
			diff(oldValue, value, ctx);
		} else {
			// the identity of this item has changed. we can now evaluate
			// whether we should replace the original item or insert a new
			// item.

			// we can insert an item if the items which used to be at this
			// index and the one before it are still in the list next to the
			// new item.
			// i.e. [0,1,2,3] -> [0,1,4,2,3] can insert 4 at index 2.
			// theoretically we could support inserting a group of items,
			// like [0,1,2,3] -> [0,1,4,5,6,2,3], but in practice this is much
			// harder to detect.
			const isPreviousItemStillThere =
				i === 0 || areTheSameIdentity(to[i - 1], fromCopy[i - 1]);
			const isNextItemStillThere =
				i === to.length - 1 ||
				areTheSameIdentity(
					to[i + 1],
					// only "i" here because in the prior list, this was the item
					// at the insertion point.
					fromCopy[i],
				);
			if (isPreviousItemStillThere && isNextItemStillThere) {
				ctx.patches.push(
					...ctx.patchCreator.createListInsert(oid, i, value, ctx.authz),
				);
				// mutate from copy to mirror this insert so further comparisons
				// are correct. we just insert an undefined.
				fromCopy.splice(i, 0, undefined);
			} else {
				// if we can't insert, we have to replace the item.
				ctx.patches.push(
					...ctx.patchCreator.createListSet(oid, i, value, ctx.authz),
				);
			}
		}
	}

	// remove any remaining items at the end of the array
	const deletedItemsAtEnd = fromCopy.length - to.length;
	if (deletedItemsAtEnd > 0) {
		// if sub-items were objects, we need to delete them all
		// this should recursively delete children of these items
		// also!
		for (let i = to.length; i < fromCopy.length; i++) {
			const value = fromCopy[i];
			deleteWithSubObjects(value, ctx);
		}
		// push the list-delete for the deleted items
		ctx.patches.push(
			...ctx.patchCreator.createListDelete(
				oid,
				to.length,
				deletedItemsAtEnd,
				ctx.authz,
			),
		);
	}
}

export function diffObjects(from: any, to: any, ctx: DiffContext) {
	const oldKeys = new Set(Object.keys(from));
	const oid = getOid(from);
	for (const key in to) {
		const value = to[key];
		if (value === undefined && ctx.merge) continue;
		oldKeys.delete(key);
		if (isOidKey(key)) continue; // legacy
		const oldValue = from[key];
		if (!isDiffableObject(value)) {
			if (!areTheSameIdentity(value, oldValue)) {
				// the value has changed for this key
				// if the value is undefined (merge is off), delete instead of
				// set.
				if (value === undefined) {
					ctx.patches.push(
						...ctx.patchCreator.createRemove(oid, key, ctx.authz),
					);
				} else {
					ctx.patches.push(
						...ctx.patchCreator.createSet(oid, key, value, ctx.authz),
					);
				}
				// if there was an old value at this key, delete it.
				deleteWithSubObjects(oldValue, ctx);
			} else {
				// two primitive, non-diffable values of the
				// same identity are considered equal.
				// we have nothing to do here.
			}
		} else {
			// make sure incoming object has a valid OID assigned,
			// and/or copy the existing value's OID if mergeUnknownObjects is
			// true.
			enforceAssignedOid(oid, value, maybeGetOid(oldValue), ctx);
			if (!oldValue) {
				// set the new value on this key
				ctx.patches.push(
					...ctx.patchCreator.createSet(oid, key, value, ctx.authz),
				);
			} else if (!areTheSameIdentity(value, oldValue)) {
				// overwrite the key with the changed value
				ctx.patches.push(
					...ctx.patchCreator.createSet(oid, key, value, ctx.authz),
				);
				// and we must also fully delete the
				// old object and its children
				deleteWithSubObjects(oldValue, ctx);
			} else {
				// finally, this is the case when the identity of
				// the new and old values are the same -- we still
				// have to diff the contents.
				diff(oldValue, value, ctx);
			}
		}
	}
	// this set now only contains keys which were not in the new object
	if (!ctx.merge) {
		for (const key of oldKeys) {
			if (isOidKey(key)) continue;
			// remove the key entirely
			ctx.patches.push(...ctx.patchCreator.createRemove(oid, key, ctx.authz));
			// push the deletes for the contents of the item
			deleteWithSubObjects(from[key], ctx);
		}
	}
}

export function deleteWithSubObjects(root: any, ctx: DiffContext) {
	if (!isDiffableObject(root)) {
		return;
	}
	const oid = maybeGetOid(root);
	if (oid) {
		ctx.patches.push(...ctx.patchCreator.createDelete(oid, ctx.authz));
		for (const key in root) {
			const value = root[key];
			deleteWithSubObjects(value, ctx);
		}
	}
}
