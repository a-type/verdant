import { mergeAttributes, Node } from '@tiptap/core';
import {
	fileIdAttribute,
	fileKeyAttribute,
	fileNameAttribute,
	fileTypeAttribute,
} from './attributes.js';

export interface VerdantMediaRendererExtensionOptions {}

/**
 * An extension for rendering TipTap documents with Verdant media nodes.
 * - ONLY works if the files being rendered are already synced to a Verdant server.
 * - ONLY works if you process the document JSON with `@verdant-web/tiptap/server`'s `attachFileUrls` function on your server.
 * It's good for static sites or server-side rendering of documents you authored
 * with Verdant.
 */
export const VerdantMediaRendererExtension =
	Node.create<VerdantMediaRendererExtensionOptions>({
		name: 'verdant-media',
		group: 'block',
		addAttributes() {
			return {
				[fileKeyAttribute]: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute(fileKeyAttribute),
					rendered: true,
				},
				[fileIdAttribute]: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute(fileIdAttribute),
					rendered: true,
				},
				alt: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute('alt'),
				},
				[fileTypeAttribute]: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute(fileTypeAttribute),
					rendered: true,
				},
				[fileNameAttribute]: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute(fileNameAttribute),
					rendered: true,
				},
				src: {
					default: null,
					keepOnSplit: false,
					parseHTML: (element) => element.getAttribute('src'),
					rendered: true,
				},
			};
		},
		parseHTML() {
			return [
				{
					tag: `[${fileKeyAttribute}]`,
					getAttrs: (element) => {
						const fileKey = element.getAttribute(fileKeyAttribute);
						const fileId = element.getAttribute(fileIdAttribute);
						const alt = element.getAttribute('alt');
						const type = element.getAttribute(fileTypeAttribute);
						const name = element.getAttribute(fileNameAttribute);
						const src = element.getAttribute('src');
						return {
							[fileKeyAttribute]: fileKey,
							[fileIdAttribute]: fileId,
							alt,
							src,
							[fileTypeAttribute]: type,
							[fileNameAttribute]: name,
						};
					},
				},
			];
		},
		renderHTML(props) {
			const src = props.node.attrs.src;
			const fileKey = props.node.attrs[fileKeyAttribute];
			const fileId = props.node.attrs[fileIdAttribute];
			const alt = props.node.attrs.alt;
			const name = props.node.attrs[fileNameAttribute];
			const type = props.node.attrs[fileTypeAttribute];

			const baseAttrs = {
				[fileKeyAttribute]: fileKey,
				[fileIdAttribute]: fileId,
				alt,
				[fileTypeAttribute]: type,
				[fileNameAttribute]: name,
			};

			if (!src) {
				return [
					'div',
					mergeAttributes(baseAttrs, props.HTMLAttributes),
					'Missing file',
				];
			}

			if (type?.startsWith('image/')) {
				return [
					'img',
					mergeAttributes({ src, ...baseAttrs }, props.HTMLAttributes),
				];
			} else if (type?.startsWith('video/')) {
				return [
					'video',
					mergeAttributes({ src, ...baseAttrs }, props.HTMLAttributes),
				];
			} else if (type?.startsWith('audio/')) {
				return [
					'audio',
					mergeAttributes({ src, ...baseAttrs }, props.HTMLAttributes),
				];
			} else {
				return [
					'a',
					mergeAttributes({ href: src, ...baseAttrs }, props.HTMLAttributes),
					'Download',
				];
			}
		},
	});
