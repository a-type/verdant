import { mergeAttributes, Node } from '@tiptap/core';
import type {
	EntityFile,
	EntityFileSnapshot,
	ObjectEntity,
} from '@verdant-web/store';
import {
	fileIdAttribute,
	fileKeyAttribute,
	fileNameAttribute,
	fileTypeAttribute,
} from './attributes.js';

export type VerdantMediaFileMap = ObjectEntity<
	Record<string, File>,
	Record<string, EntityFile | undefined>,
	Record<string, EntityFileSnapshot>
>;
export interface VerdantMediaExtensionOptions {
	fileMap: VerdantMediaFileMap;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		verdantMedia: {
			/**
			 * Add a file to the editor content.
			 * @param file The file to add.
			 * @example
			 * editor
			 *   .commands
			 *   .insertMedia({ src: 'https://tiptap.dev/logo.png', alt: 'tiptap', title: 'tiptap logo' })
			 */
			insertMedia: (file: File) => ReturnType;
		};
	}
}

export const VerdantMediaExtension = Node.create<VerdantMediaExtensionOptions>({
	name: 'verdant-media',
	group: 'block',
	draggable: true,
	addOptions() {
		return {
			fileMap: null as any,
		};
	},
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
		};
	},
	parseHTML() {
		return [
			{
				tag: `[${fileKeyAttribute}]`,
				getAttrs: (element) => {
					let fileKey = element.getAttribute(fileKeyAttribute);

					// back compat
					if (!fileKey && element.getAttribute('data-verdant-file')) {
						fileKey = element.getAttribute('data-verdant-file');
					}

					const fileId = element.getAttribute(fileIdAttribute);
					const alt = element.getAttribute('alt');
					const type = element.getAttribute(fileTypeAttribute);
					const name = element.getAttribute(fileNameAttribute);

					return {
						[fileKeyAttribute]: fileKey,
						alt,
						[fileTypeAttribute]: type,
						[fileNameAttribute]: name,
						[fileIdAttribute]: fileId,
					};
				},
			},
		];
	},
	renderHTML(props) {
		const fileKey = props.node.attrs[fileKeyAttribute];
		if (!fileKey) {
			return ['div', props.HTMLAttributes, 'Missing file'];
		}
		const file = this.options.fileMap.get(fileKey);
		if (!file) {
			return ['div', props.HTMLAttributes, 'Missing file'];
		}
		const fileId = file.id;
		const baseAttrs = {
			[fileKeyAttribute]: fileKey,
			[fileIdAttribute]: fileId,
			[fileTypeAttribute]: file.type,
			[fileNameAttribute]: file.name,
		};
		if (file.loading) {
			// this means the user didn't preload files before rendering...
			return [
				'div',
				mergeAttributes(baseAttrs, props.HTMLAttributes),
				'Loading file. This file was not preloaded before rendering the document.',
			];
		}
		const type = file.type;
		if (type?.startsWith('image/')) {
			return [
				'img',
				mergeAttributes({ src: file.url, ...baseAttrs }, props.HTMLAttributes),
			];
		} else if (type?.startsWith('video/')) {
			return [
				'video',
				mergeAttributes({ src: file.url, ...baseAttrs }, props.HTMLAttributes),
			];
		} else if (type?.startsWith('audio/')) {
			return [
				'audio',
				mergeAttributes({ src: file.url, ...baseAttrs }, props.HTMLAttributes),
			];
		} else {
			// TODO: render file download
			return [
				'div',
				mergeAttributes(baseAttrs, props.HTMLAttributes),
				'Unsupported file type',
			];
		}
	},
	onBeforeCreate() {
		this.editor.on('paste', (event) => {
			const files = Array.from(event.event.clipboardData?.files ?? []);
			if (files.length === 0) {
				return;
			}
			for (const file of files) {
				this.editor.chain().insertMedia(file).run();
			}
			event.event.preventDefault();
		});
		this.editor.on('drop', (event) => {
			const files = Array.from(event.event.dataTransfer?.files ?? []);
			if (files.length === 0) {
				return;
			}
			for (const file of files) {
				this.editor.chain().insertMedia(file).run();
			}
			event.event.preventDefault();
		});
		this.editor.on('update', ({ transaction }) => {
			const fileIds = new Set<string>();
			transaction.doc.forEach((node) => {
				if (node.attrs[fileKeyAttribute]) {
					fileIds.add(node.attrs[fileKeyAttribute]);
				}
			});
			transaction.before.forEach((node) => {
				const fileId = node.attrs[fileKeyAttribute];
				if (fileId && !fileIds.has(fileId)) {
					// the file was removed from the document
					this.options.fileMap.delete(fileId);
				}
			});
		});
	},
	addCommands() {
		return {
			insertMedia:
				(file: File) =>
				({ commands }) => {
					const fileKey = crypto.randomUUID();
					this.options.fileMap.set(fileKey, file);
					const storedFile = this.options.fileMap.get(fileKey);
					if (!storedFile) {
						throw new Error('Failed to store file in file map');
					}
					return commands.insertContent(
						{
							type: this.name,
							attrs: {
								[fileKeyAttribute]: fileKey,
								[fileTypeAttribute]: file.type,
								[fileNameAttribute]: file.name,
								[fileIdAttribute]: storedFile.id,
							},
						} as any,
						{
							updateSelection: false,
						},
					);
				},
		};
	},
	addNodeView() {
		return ({ node, HTMLAttributes, extension }) => {
			// create a root div to house all content
			const root = document.createElement('div');
			// we don't want users editing this content
			root.setAttribute('contenteditable', 'false');
			// attach any existing attributes if they are not null
			Object.entries(HTMLAttributes).forEach(([key, value]) => {
				if (value !== null) {
					root.setAttribute(key, value as string);
				}
			});

			// get the file ID from attrs
			const fileId = node.attrs[fileKeyAttribute];
			if (!fileId) {
				root.textContent = 'Missing file';
				return {
					dom: root,
				};
			}

			// look up the file in the file map
			// NOTE: for convenience/typing, "this" is used
			// here, but in a userland node view you'd use `extension`.
			const file = this.options.fileMap.get(fileId);

			// this is a helper function to reconstruct the DOM
			// whenever the file changes
			function updateRootContent() {
				// clear the DOM
				root.innerHTML = '';
				if (file) {
					// minimal loading state
					if (file.loading) {
						root.textContent = 'Loading...';
						return;
					}

					// minimal error state
					if (file.failed) {
						root.textContent = 'Failed to load file';
						return;
					}

					// it's unlikely we get here without a url
					// but just in case
					const url = file.url;
					if (!url) {
						root.textContent = 'Failed to load file';
						return;
					}

					// based on the file type, we try to render
					// a useful DOM representation
					const type = file.type;
					if (type?.startsWith('image/')) {
						const img = document.createElement('img');
						img.src = file.url;
						root.appendChild(img);
					} else if (type?.startsWith('video/')) {
						const video = document.createElement('video');
						video.src = file.url;
						video.controls = true;
						root.appendChild(video);
					} else if (type?.startsWith('audio/')) {
						const audio = document.createElement('audio');
						audio.src = file.url;
						audio.controls = true;
						root.appendChild(audio);
					} else {
						const a = document.createElement('a');
						a.href = file.url;
						a.textContent = 'Download';
						root.appendChild(a);
					}
				}
			}

			// if the file is not in the file map, we subscribe to changes
			// to its key in the map, and update the DOM when it changes.
			if (!file) {
				const unsub = this.options.fileMap.subscribeToField(
					fileId,
					'change',
					(file) => {
						if (!file) return;
						// we can unsub after the first change, all further
						// changes can be monitored on the file itself.
						unsub();
						file.subscribe('change', updateRootContent);
						updateRootContent();
					},
				);
				root.textContent = 'Missing file';
				return {
					dom: root,
				};
			} else {
				// otherwise, we go ahead and render whatever we have, and
				// subscribe to future changes on the file for further
				// updates.
				updateRootContent();
				file.subscribe('change', updateRootContent);
				return {
					dom: root,
				};
			}
		};
	},
});

export function createVerdantMediaExtension(fileMap: VerdantMediaFileMap) {
	return VerdantMediaExtension.configure({ fileMap });
}

/**
 * Preloads all files provided in the file map field. Use of this
 * is highly recommended, if not required, when rendering a document
 * to HTML. TipTap will not wait for files to load, so if they are
 * not preloaded they will be blank in the rendered version.
 */
export async function preloadMedia(files: VerdantMediaFileMap) {
	await Promise.all(
		Array.from(files.values()).map((file) => {
			if (!file) return Promise.resolve();
			// since files immediately begin loading on access,
			// we just wait for the file to finish loading
			if (!file.loading) return Promise.resolve();
			return new Promise<void>((resolve) => {
				const unsub = file.subscribe('change', () => {
					if (!file.loading) {
						unsub();
						resolve();
					}
				});
			});
		}),
	);
}

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
