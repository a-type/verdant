import { FileRef, isFileRef } from './files.js';
import { isObjectRef, ObjectRef } from './operation.js';

export function isRef(obj: any): obj is ObjectRef | FileRef {
	return isObjectRef(obj) || isFileRef(obj);
}

export function compareRefs(a: any, b: any) {
	if (a === b) return true;
	if (!isRef(a) || !isRef(b)) return false;
	if (a['@@type'] !== b['@@type']) return false;
	if (a.id !== b.id) return false;
	return true;
}

export type Ref = ObjectRef | FileRef;

export function makeObjectRef(oid: string): ObjectRef {
	return { '@@type': 'ref', id: oid };
}

export function makeFileRef(oid: string): FileRef {
	return { '@@type': 'file', id: oid };
}
