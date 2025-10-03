import type { LibraryApi } from '@verdant-web/server';
import {
	fileIdAttribute,
	fileNameAttribute,
	fileTypeAttribute,
} from '../extensions/attributes.js';

export { VerdantMediaRendererExtension } from '../extensions/VerdantMediaRenderer.js';

/**
 * Attaches file URLs to all Verdant media nodes in the document, according
 * to the file service attached to your Verdant server.
 */
export async function attachFileUrls(
	document: any,
	libraryId: string,
	libraryApi: LibraryApi,
) {
	await visitNode(document, libraryId, libraryApi);
	return document;
}

async function visitNode(node: any, libraryId: string, server: LibraryApi) {
	if (node.type === 'verdant-media') {
		const fileId = node.attrs[fileIdAttribute];
		if (fileId) {
			const file = await server.getFileInfo(fileId);
			if (file) {
				node.attrs.src = file.url;
				node.attrs[fileTypeAttribute] = file.type;
				node.attrs[fileNameAttribute] = file.name;
				node.attrs[fileIdAttribute] = file.id;
			}
		}
	} else if (node.content) {
		await Promise.all(
			node.content.map((child: any) => visitNode(child, libraryId, server)),
		);
	}
}

// provide minimal WebSocket typings for Node.js environment
// so we can use the same codebase for both Cloudflare and Node.js
// without running into typing issues
// (these are just the methods we actually use)
declare global {
	interface WebSocket {
		close(): void;
		send(
			data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView,
		): void;
		addEventListener(
			type: string,
			listener: (this: WebSocket, ev: any) => any,
			options?: any,
		): void;
		removeEventListener(
			type: string,
			listener: (this: WebSocket, ev: any) => any,
			options?: any,
		): void;
	}
}
