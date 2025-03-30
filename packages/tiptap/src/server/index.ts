import type { Server } from '@verdant-web/server';
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
	server: Server,
) {
	await visitNode(document, libraryId, server);
	return document;
}

async function visitNode(node: any, libraryId: string, server: Server) {
	if (node.type === 'verdant-media') {
		const fileId = node.attrs[fileIdAttribute];
		if (fileId) {
			const file = await server.getFileData(libraryId, fileId);
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
