import { isFileRef } from './files.js';
import { isObjectRef } from './operation.js';

export function isRef(obj: any) {
	return isObjectRef(obj) || isFileRef(obj);
}

export function compareRefs(a: any, b: any) {
	if (a === b) return true;
	if (!isRef(a) || !isRef(b)) return false;
	if (a['@@type'] !== b['@@type']) return false;
	if (a.id !== b.id) return false;
	return true;
}
