import jsp, { Operation } from 'fast-json-patch';
const { compare, applyOperation, escapePathComponent, getValueByPointer } = jsp;

export type ListMoveOperation = {
	op: 'list-move';
	path: string;
	from: number;
	to: number;
};
export type ListPushOperation = {
	op: 'list-push';
	path: string;
	value: any;
};
export type ListOperation = ListMoveOperation | ListPushOperation;
export type PatchOperation = Operation | ListOperation;
export type SyncPatchDiff = PatchOperation[];
export type SyncPatch = SyncPatchDiff | 'DELETE';

type KeyPath = (string | number | symbol)[];

function constructNested(obj: any, path: KeyPath) {
	let current: any = {};
	const root = current;
	for (let i = 0; i < path.length; i++) {
		let level = i === path.length - 1 ? obj : {};
		current[path[i]] = level;
		current = level;
	}
	return root;
}

export function createPatch(
	from: any,
	to: any,
	keyPath?: KeyPath,
): SyncPatchDiff {
	if (keyPath?.length) {
		return compare(
			constructNested(from, keyPath),
			constructNested(to, keyPath),
		);
	}
	return compare(from, to);
}

function applyListMove(obj: any, operation: ListMoveOperation) {
	const array = getValueByPointer(obj, operation.path);
	if (!Array.isArray(array)) {
		throw new Error(`Expected array at ${operation.path}, got ${array}`);
	}
	while (operation.to >= array.length) {
		array.push(undefined);
	}
	array.splice(operation.to, 0, array.splice(operation.from, 1)[0]);
	return applyOperation(obj, {
		op: 'replace',
		path: operation.path,
		value: array,
	}).newDocument;
}

function applyListPush(obj: any, operation: ListPushOperation) {
	const array = getValueByPointer(obj, operation.path);
	if (!Array.isArray(array)) {
		throw new Error(`Expected array at ${operation.path}, got ${array}`);
	}
	array.push(operation.value);
	return applyOperation(obj, {
		op: 'replace',
		path: operation.path,
		value: array,
	}).newDocument;
}

export function applyPatchOperation(obj: any, operation: PatchOperation): any {
	if (operation.op === 'list-move') {
		return applyListMove(obj, operation);
	}
	if (operation.op === 'list-push') {
		return applyListPush(obj, operation);
	}
	return applyOperation(obj, operation).newDocument;
}

export function applyPatch<T>(base: T, patch: SyncPatch) {
	if (patch === 'DELETE') {
		return undefined;
	}
	let cur = base;
	for (const operation of patch) {
		cur = applyPatchOperation(base, operation);
	}
	return cur;
}

export function createListPushPatch(
	item: any,
	keyPath: KeyPath,
): SyncPatchDiff {
	return [
		{
			op: 'list-push',
			path: `${keyPathToJsonPointer(keyPath)}`,
			value: item,
		},
	];
}

export function createListMovePatch(
	from: number,
	to: number,
	keyPath: KeyPath,
): SyncPatchDiff {
	return [
		{
			op: 'list-move',
			path: keyPathToJsonPointer(keyPath),
			from,
			to,
		},
	];
}

export function createAssignPatch(
	item: any,
	path: string | number | symbol,
	keyPath: KeyPath,
): SyncPatchDiff {
	return [
		{
			op: 'replace',
			path: keyPathToJsonPointer(keyPath.concat(path)),
			value: item,
		},
	];
}

export function keyPathToJsonPointer(keyPath: KeyPath) {
	return (
		'/' +
		keyPath
			.map((i) => i.toString())
			.map(escapePathComponent)
			.join('/')
	);
}
