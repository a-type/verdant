import 'fake-indexeddb/auto/index.mjs';

// patch URL.createObjectURL to return a string
// @ts-ignore
URL.createObjectURL = (blob: Blob) => {
	return `blob:${blob.type}:${blob.size}`;
};
