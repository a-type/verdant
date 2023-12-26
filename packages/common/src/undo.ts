import { ObjectIdentifier } from './oids.js';
import { applyPatch, Operation } from './operation.js';
import { cloneDeep } from './utils.js';

export function getUndoOperations(
	oid: ObjectIdentifier,
	initial: any,
	operations: Operation[],
	getNow: () => string,
): Operation[] {
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
			},
		];
	}
	// otherwise, traverse the operations one by one,
	// applying them, and using the prior state to determine
	// what the undo operation is.
	let state = cloneDeep(initial);
	const undoOperations: Operation[] = [];
	for (const operation of operations) {
		const undo = getUndoOperation(oid, state, operation, getNow);
		undoOperations.unshift(...undo);
		applyPatch(state, operation.data);
	}
	return undoOperations;
}

function getUndoOperation(
	oid: ObjectIdentifier,
	initial: any,
	operation: Operation,
	getNow: () => string,
): Operation[] {
	const data = operation.data;
	switch (data.op) {
		case 'set':
		case 'remove':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'set',
						name: data.name,
						value: initial[data.name],
					},
				},
			];
		case 'list-insert':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-delete',
						index: data.index,
						count: 1,
					},
				},
			];
		case 'list-delete':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-insert',
						index: data.index,
						values: initial.slice(data.index, data.count),
					},
				},
			];
		case 'list-move-by-ref':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-move-by-ref',
						value: data.value,
						index: initial.indexOf(data.value),
					},
				},
			];
		case 'list-move-by-index':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-move-by-index',
						from: data.to,
						to: data.from,
					},
				},
			];
		case 'delete':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'initialize',
						value: initial,
					},
				},
			];
		case 'list-push':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-remove',
						value: data.value,
						// best heuristic here - remove the last instance of the item.
						only: 'last',
					},
				},
			];
		case 'list-remove':
			if (data.only === 'last') {
				const index = initial.lastIndexOf(data.value);
				return [
					{
						oid,
						timestamp: getNow(),
						data: {
							op: 'list-insert',
							index,
							values: [data.value],
						},
					},
				];
			} else if (data.only === 'first') {
				const index = initial.indexOf(data.value);
				return [
					{
						oid,
						timestamp: getNow(),
						data: {
							op: 'list-insert',
							index,
							values: [data.value],
						},
					},
				];
			} else {
				// find all instances of value and restore them at their
				// original index
				const indexesOfValue = [];
				let index = initial.indexOf(data.value);
				while (index !== -1) {
					indexesOfValue.push(index);
					index = initial.indexOf(data.value, index + 1);
				}
				return indexesOfValue.map((index) => ({
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-insert',
						index,
						value: data.value,
					},
				}));
			}
		case 'list-add':
			// this one is kind of ambiguous. in theory the set may have
			// already included the value and so no change happened. but
			// basically we infer the intent is to remove what was meant
			// to be added by this change.
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'list-remove',
						value: data.value,
						only: 'last',
					},
				},
			];
		case 'initialize':
			return [
				{
					oid,
					timestamp: getNow(),
					data: {
						op: 'delete',
					},
				},
			];
		case 'touch':
			return [];
		default:
			throw new Error(`Cannot undo operation type: ${(data as any).op}`);
	}
}
