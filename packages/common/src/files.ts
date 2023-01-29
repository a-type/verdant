import cuid from 'cuid';

export function createFileData(file: File): FileData {
	return {
		id: cuid(),
		file: file,
		url: undefined,
		remote: false,
		name: file.name,
		type: file.type,
	};
}

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

/**
 * Replaces File values with refs and returns the normalized value.
 * The list of files passed to the second argument will be populated with the files found in the value.
 */
export function processValueFiles(
	value: any,
	onFileIdentified: (fileData: FileData) => void,
): any {
	if (value instanceof File) {
		const data = createFileData(value);
		onFileIdentified(data);
		return createFileRef(data.id);
	}

	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			value[i] = processValueFiles(value[i], onFileIdentified);
		}
		return value;
	}

	if (typeof value === 'object') {
		for (const key in value) {
			value[key] = processValueFiles(value[key], onFileIdentified);
		}
		return value;
	}

	return value;
}

export function fileToArrayBuffer(file: File | Blob) {
	return new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(reader.result as ArrayBuffer);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

export function getAllFileFields(snapshot: any): [string, FileRef][] {
	return Object.entries(snapshot).filter((entry) => isFileRef(entry[1])) as [
		string,
		FileRef,
	][];
}
