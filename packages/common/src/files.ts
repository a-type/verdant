import { isObject } from './utils.js';

export type FileRef = {
	'@@type': 'file';
	id: string;
};

export function isFileRef(value: any): value is FileRef {
	return value && value['@@type'] === 'file';
}
export function createFileRef(id: string): FileRef {
	return {
		'@@type': 'file',
		id,
	};
}

export type FileData = {
	id: string;
	/**
	 * For locally created files, this starts false, until it's uploaded
	 * Remote files this is always true
	 */
	remote: boolean;
	name: string;
	type: string;
	/** A local File instance, if available. */
	file?: Blob;
	/** The server URL of this file. */
	url?: string;
};

export function getAllFileFields(snapshot: any): [string, FileRef][] {
	return Object.entries(snapshot).filter((entry) => isFileRef(entry[1])) as [
		string,
		FileRef,
	][];
}

export function isFile(value: any) {
	if (typeof File !== 'undefined' && value instanceof File) {
		return true;
	}
	if (typeof Blob !== 'undefined' && value instanceof Blob) {
		return true;
	}
	return false;
}

export function isFileData(value: any): value is FileData {
	return (
		value &&
		isObject(value) &&
		typeof value.id === 'string' &&
		typeof value.remote === 'boolean' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string'
	);
}
