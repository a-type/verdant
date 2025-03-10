import { AuthorizationKey } from './authz.js';
import { ObjectIdentifier } from './oids.js';
import { applyPatch, Operation } from './operation.js';
import { PatchCreator } from './patch.js';
import { isRef } from './refs.js';
import { cloneDeep } from './utils.js';

export function getUndoOperations(
	oid: ObjectIdentifier,
	initial: any,
	operations: Operation[],
	getNow: () => string,
	getSubId?: () => string,
	authz?: AuthorizationKey,
): Operation[] {
	const patchCreator = new PatchCreator(getNow, getSubId);
	if (initial === undefined || initial === null) {
		// if the initial state is nothing, then the undo is to delete everything.
		// there's nothing else to worry about!
		return [
			{
				oid,
				timestamp: getNow(),
				data: {
					op: 'delete',
				},
				authz,
			},
		];
	}
	// otherwise, traverse the operations one by one,
	// applying them, and using the prior state to determine
	// what the undo operation is.
	let state = cloneDeep(initial);
	const undoOperations: Operation[] = [];
	for (const operation of operations) {
		const undo = getUndoOperation(oid, state, operation, patchCreator, authz);
		undoOperations.unshift(...undo);
		applyPatch(state, operation.data);
	}
	return undoOperations;
}

function getUndoOperation(
	oid: ObjectIdentifier,
	initial: any,
	operation: Operation,
	patchCreator: PatchCreator,
	authz?: AuthorizationKey,
): Operation[] {
	const data = operation.data;
	switch (data.op) {
		case 'set':
			if (initial[data.name] === undefined) {
				return patchCreator.createRemove(oid, data.name, authz);
			}
			return patchCreator.createSet(oid, data.name, initial[data.name], authz);
		case 'remove':
			if (initial[data.name] === undefined) {
				return [];
			}
			return patchCreator.createSet(oid, data.name, initial[data.name], authz);
		case 'list-insert':
			if (data.value === undefined && data.values?.length === 0) return [];
			return patchCreator.createListDelete(
				oid,
				data.index,
				data.value ? 1 : data.values?.length || 0,
				authz,
			);
		case 'list-delete':
			return patchCreator.createListInsertMany(
				oid,
				data.index,
				initial.slice(data.index, data.index + data.count),
				authz,
			);
		case 'list-move-by-ref':
			return patchCreator.createListMoveByRef(
				oid,
				data.value,
				findItemRefIndex(initial, data.value),
				authz,
			);
		case 'list-move-by-index':
			return patchCreator.createListMoveByIndex(oid, data.to, data.from, authz);
		case 'delete':
			return patchCreator.createInitialize(initial, oid, authz, true);
		case 'list-push':
			return patchCreator.createListRemove(oid, data.value, 'last', authz);
		case 'list-remove':
			if (data.only === 'last') {
				const index = findItemRefIndex(initial, data.value, 0, 'backward');
				if (index === -1) {
					// if the value isn't in the list, then there's nothing to undo.
					return [];
				}
				return patchCreator.createListInsert(oid, index, data.value, authz);
			} else if (data.only === 'first') {
				const index = findItemRefIndex(initial, data.value);
				if (index === -1) {
					// if the value isn't in the list, then there's nothing to undo.
					return [];
				}
				return patchCreator.createListInsert(oid, index, data.value, authz);
			} else {
				// find all instances of value and restore them at their
				// original index
				const indexesOfValue = [];
				let index = findItemRefIndex(initial, data.value);
				while (index !== -1) {
					indexesOfValue.push(index);
					index = findItemRefIndex(initial, data.value, index + 1);
				}
				return indexesOfValue.flatMap((index) =>
					patchCreator.createListInsert(oid, index, data.value, authz),
				);
			}
		case 'list-add':
			// this one is kind of ambiguous. in theory the set may have
			// already included the value and so no change happened. but
			// basically we infer the intent is to remove what was meant
			// to be added by this change.
			return patchCreator.createListRemove(oid, data.value, 'last', authz);
		case 'list-set':
			if (initial[data.index] !== undefined) {
				return patchCreator.createListSet(
					oid,
					data.index,
					initial[data.index],
					authz,
				);
			}
			return patchCreator.createListDelete(oid, data.index, 1, authz);
		case 'initialize':
			return patchCreator.createDelete(oid, authz);
		case 'touch':
			return [];
		default:
			throw new Error(`Cannot undo operation type: ${(data as any).op}`);
	}
}

function findItemRefIndex(
	list: any[],
	item: any,
	from: number = 0,
	dir: 'forward' | 'backward' = 'forward',
) {
	const method = dir === 'forward' ? 'findIndex' : 'findLastIndex';
	// for object items, attempt to find the matching item by OID.
	if (isRef(item)) {
		return list[method](
			(i, idx) => isRef(i) && i.id === item.id && idx >= from,
		);
	}
	return list[method]((i, idx) => i === item && idx >= from);
}
