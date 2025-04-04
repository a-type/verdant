import { Extension, JSONContent } from '@tiptap/core';
import { assignOid, cloneDeep, maybeGetOid } from '@verdant-web/common';
import { AnyEntity, getEntityClient, ObjectEntity } from '@verdant-web/store';
import { verdantIdAttribute } from './attributes.js';

export interface VerdantExtensionOptions {
	parent: AnyEntity<any, any, any>;
	fieldName: string | number;
	nullDocumentDefault?: any;
	batchConfig?: {
		undoable?: boolean;
		batchName?: string;
		max?: number | null;
		timeout?: number | null;
	};
}
export const VerdantExtension = Extension.create<
	VerdantExtensionOptions,
	{ updating: boolean; unsubscribe: (() => void) | null }
>({
	name: 'verdant',
	addOptions() {
		return {
			parent: null as any,
			fieldName: '',
			nullDocumentDefault: null,
			batchConfig: {
				undoable: true,
				batchName: 'tiptap',
				max: null,
				timeout: 600,
			},
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
					[verdantIdAttribute]: {
						default: null,
						keepOnSplit: false,
						parseHTML: (element) => element.getAttribute(verdantIdAttribute),
						renderHTML: (attributes) => {
							if (!attributes[verdantIdAttribute]) return {};
							return {
								[verdantIdAttribute]: attributes[verdantIdAttribute],
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
		if (fieldSchema.nullable && !fieldSchema.default && !nullDocumentDefault) {
			throw new Error(
				'VerdantOidExtension requires a nullDocumentDefault for a nullable document field',
			);
		}
	},
	onCreate() {
		const { parent, fieldName, nullDocumentDefault } = this.options;
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
					if (!field.deleted && (!info.isLocal || target === field)) {
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
			formatSnapshotForVerdantAndAssignOids(newData);
			// printAllOids(newData);
			const client = getEntityClient(value);
			client.batch(this.options.batchConfig).run(() => {
				value.update(newData, {
					merge: false,
					dangerouslyDisableMerge: true,
					replaceSubObjects: false,
				});
			});
		}
	},
	onDestroy() {
		this.storage.unsubscribe?.();
	},
});

export type ValidEntityKey<Ent extends AnyEntity<any, any, any>> =
	Ent extends never
		? string
		: Ent extends AnyEntity<any, any, infer Shape>
			? keyof Shape
			: never;

export type EntitySnapshot<
	Ent extends AnyEntity<any, any, any>,
	Key extends ValidEntityKey<Ent>,
> =
	Ent extends AnyEntity<any, any, infer Snap>
		? Key extends keyof Snap
			? Snap[Key]
			: any
		: never;

export function createVerdantExtension<
	TEnt extends AnyEntity<any, any, any>,
	Key extends ValidEntityKey<TEnt>,
>(
	parent: TEnt,
	fieldName: Key,
	options?: Omit<
		VerdantExtensionOptions,
		'parent' | 'fieldName' | 'nullDocumentDefault'
	> & {
		nullDocumentDefault?: EntitySnapshot<TEnt, Key>;
	},
) {
	return VerdantExtension.configure({
		parent,
		fieldName: fieldName as string | number,
		...options,
	});
}

function formatSnapshotForVerdantAndAssignOids(doc: JSONContent) {
	if (doc.attrs?.[verdantIdAttribute] !== undefined) {
		assignOid(doc, doc.attrs[verdantIdAttribute]);
		delete doc.attrs[verdantIdAttribute];
	}
	// make sure all fields are present, even if null.
	if (doc.from === undefined) {
		doc.from = null;
	}
	if (doc.to === undefined) {
		doc.to = null;
	}
	if (doc.text === undefined) {
		doc.text = null as any;
	}
	if (doc.attrs === undefined) {
		doc.attrs = {};
	}
	if (doc.marks === undefined) {
		doc.marks = null as any;
	}
	if (doc.content) {
		doc.content.forEach(formatSnapshotForVerdantAndAssignOids);
	}
}

// since the schema doesn't enforce this shape but it's
// needed for the editor to work, we'll ensure it here
function ensureDocShape(json: any) {
	for (const node of json.content ?? []) {
		// remove undefined nodes
		node.content = node.content?.filter((n: any) => !!n).map(ensureDocShape);
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
		doc.attrs[verdantIdAttribute] = oid;
	}
	if (doc.content) {
		doc.content.forEach(addOidAttrs);
	}
}
