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
			console.log(node);
			if (!node.isText && (!node.attrs.id || usedIds.has(node.attrs.id))) {
				const nodeId = id();
				console.log('adding node id', nodeId);
				tr.setNodeMarkup(pos, null, {
					...node.attrs,
					id: nodeId,
				});
				usedIds.add(nodeId);
			} else if (node.attrs?.id) {
				usedIds.add(node.attrs.id);
			}
		});
		return tr;
	},
});

const defaultAllNodes = [
	'blockquote',
	'bulletList',
	'codeBlock',
	'heading',
	'listItem',
	'orderedList',
	'paragraph',
	'image',
	'mention',
	'table',
	'taskList',
	'taskItem',
	'youtube',
];
export const NodeIdExtension = (
	options: {
		nodeTypes?: string[];
	} = {},
) =>
	Extension.create({
		name: 'nodeId',
		addProseMirrorPlugins() {
			return [NodeIdPlugin];
		},
		addGlobalAttributes() {
			return [
				{
					types: options.nodeTypes || defaultAllNodes,
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
