import { Extension } from '@tiptap/core';

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { id } from '@verdant-web/store';

const NodeIdPlugin = new Plugin({
	key: new PluginKey('node-ids'),
	appendTransaction: (_, oldState, newState) => {
		// no changes
		if (newState.doc === oldState.doc) return;
		const tr = newState.tr;
		// force replacement of any duplicates, too
		const usedIds = new Set<string>();
		newState.doc.descendants((node, pos) => {
			if (
				!node.isText &&
				(!node.attrs.id || usedIds.has(node.attrs.id)) &&
				node !== newState.doc
			) {
				const nodeId = id();
				try {
					tr.setNodeMarkup(pos, null, {
						...node.attrs,
						id: nodeId,
					});
					usedIds.add(nodeId);
				} catch (err) {
					console.error('Error assigning node ID', err);
				}
			} else if (node.attrs?.id) {
				usedIds.add(node.attrs.id);
			}
		});
		return tr;
	},
});
export const NodeIdExtension = Extension.create({
	name: 'nodeId',
	addProseMirrorPlugins() {
		return [NodeIdPlugin];
	},
	addOptions() {
		return {
			types: [],
		};
	},
	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					id: {
						default: null,
						keepOnSplit: false,
						parseHTML: (element) => element.getAttribute('data-id'),
						renderHTML: (attributes) => {
							if (!attributes.id) return {};
							return {
								'data-id': attributes.id,
							};
						},
					},
				},
			},
		];
	},
});
