import { Extension, JSONContent } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { assignOid, cloneDeep, maybeGetOid } from '@verdant-web/common';
import { AnyEntity, id, ObjectEntity } from '@verdant-web/store';

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

const verdantOidAttribute = 'data-verdant-oid';
export const VerdantOidExtension = Extension.create<
	{
		parent: AnyEntity<any, any, any>;
		fieldName: string | number;
		nullDocumentDefault?: any;
		types?: string[];
	},
	{ updating: boolean; unsubscribe: (() => void) | null }
>({
	name: 'verdantOid',
	addOptions() {
		return {
			parent: null as any,
			fieldName: '',
			nullDocumentDefault: null,
		};
	},
	addStorage() {
		return {
			updating: false,
			unsubscribe: null,
		};
	},
	addGlobalAttributes() {
		const nodeTypes = this.extensions
			.filter((ext) => ext.type === 'node')
			.filter((ext) => ext.config.group !== 'inline')
			.map((ext) => ext.name)
			.filter((s) => s !== null);
		return [
			{
				types: nodeTypes,
				attributes: {
					[verdantOidAttribute]: {
						default: null,
						keepOnSplit: false,
						parseHTML: (element) => element.getAttribute(verdantOidAttribute),
						renderHTML: (attributes) => {
							if (!attributes[verdantOidAttribute]) return {};
							return {
								[verdantOidAttribute]: attributes[verdantOidAttribute],
							};
						},
					},
				},
			},
		];
	},
	onBeforeCreate() {
		const { parent, fieldName, nullDocumentDefault } = this.options;
		// validate options
		if (!parent) {
			throw new Error('VerdantOidExtension requires a parent entity');
		}
		if (!fieldName) {
			throw new Error('VerdantOidExtension requires a field name');
		}
		const fieldSchema = parent.getFieldSchema(fieldName);
		if (!fieldSchema) {
			throw new Error(
				`VerdantOidExtension error: ${fieldName} is not a valid field of the parent entity`,
			);
		}
		if (fieldSchema.type !== 'object') {
			throw new Error(
				`VerdantOidExtension requires an object field for the document, ${fieldName} is a ${fieldSchema.type}`,
			);
		}
		if (fieldSchema.nullable && !nullDocumentDefault) {
			throw new Error(
				'VerdantOidExtension requires a nullDocumentDefault for a nullable document field',
			);
		}

		// subscribe to field changes
		let unsubscribe: (() => void) | null = null;
		const updateFromField = (field: ObjectEntity<any, any> | null) => {
			if (this.editor && !this.editor.isDestroyed) {
				this.storage.updating = true;
				const { from, to } = this.editor.state.selection;
				this.editor.commands.setContent(
					ensureDocShape(
						getFieldSnapshot(field, nullDocumentDefault, fieldName),
					),
					false,
				);
				this.editor.commands.setTextSelection({ from, to });
				this.storage.updating = false;
			}
		};
		const subscribeToDocumentChanges = () => {
			const field = parent.get(fieldName) as ObjectEntity<any, any> | null;
			if (field) {
				unsubscribe = field.subscribe('changeDeep', (target, info) => {
					if (!info.isLocal || target === field) {
						updateFromField(field);
					}
				});
				updateFromField(field);
			}
		};
		this.storage.unsubscribe = parent.subscribe('change', (info) => {
			unsubscribe?.();
			subscribeToDocumentChanges();
		});
		subscribeToDocumentChanges();
	},
	onUpdate() {
		// this flag is set synchronously while applying changes from the entity
		// to the editor. if it's true, we don't want to apply changes from the editor
		// back to the entity again, making an infinite cycle.
		if (this.storage.updating) {
			return;
		}

		const newData = this.editor.getJSON();
		const value = this.options.parent.get(
			this.options.fieldName,
		) as ObjectEntity<any, any> | null;
		if (!value) {
			this.options.parent.set(this.options.fieldName as any, newData);
		} else {
			// re-assign oids to data objects so they can be diffed more effectively
			// against existing data
			consumeOidsAndAssignToSnapshots(newData);
			// printAllOids(newData);
			value.update(newData, {
				merge: false,
				dangerouslyDisableMerge: true,
				replaceSubObjects: false,
			});
		}
	},
	onDestroy() {
		this.storage.unsubscribe?.();
	},
});

function consumeOidsAndAssignToSnapshots(doc: JSONContent) {
	if (doc.attrs?.[verdantOidAttribute] !== undefined) {
		assignOid(doc, doc.attrs[verdantOidAttribute]);
		delete doc.attrs[verdantOidAttribute];
	}
	if (doc.content) {
		doc.content.forEach(consumeOidsAndAssignToSnapshots);
	}
}

// since the schema doesn't enforce this shape but it's
// needed for the editor to work, we'll ensure it here
function ensureDocShape(json: any) {
	for (const node of json.content ?? []) {
		// remove undefined nodes
		node.content = node.content.filter((n: any) => !!n).map(ensureDocShape);
	}
	return json;
}

function getFieldSnapshot(
	field: ObjectEntity<any, any> | undefined | null,
	nullDocumentDefault: any,
	fieldName: string | symbol | number,
) {
	const content = field
		? cloneDeep(field.getSnapshot())
		: (nullDocumentDefault ?? null);
	if (content === null) {
		throw new Error(`The provided field "${String(fieldName)}" is null and a default document was not provided.
		Please provide a default document or ensure the field is not null when calling useSyncedEditor, or make your
		field schema non-null and specify a default document there.`);
	}
	addOidAttrs(content);
	return content;
}

function addOidAttrs(doc: JSONContent) {
	const oid = maybeGetOid(doc);
	if (oid) {
		doc.attrs = doc.attrs ?? {};
		doc.attrs[verdantOidAttribute] = oid;
	}
	if (doc.content) {
		doc.content.forEach(addOidAttrs);
	}
}

function printAllOids(obj: any) {
	if (obj && typeof obj === 'object') {
		const oid = maybeGetOid(obj);
		if (oid) console.log(oid, obj);
		for (const key in obj) {
			printAllOids(obj[key]);
		}
	}
}
