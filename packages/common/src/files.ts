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
	file?: Blob;
	url?: string;
};

export function getAllFileFields(snapshot: any): [string, FileRef][] {
	return Object.entries(snapshot).filter((entry) => isFileRef(entry[1])) as [
		string,
		FileRef,
	][];
}
