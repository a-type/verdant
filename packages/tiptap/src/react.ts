import { Editor } from '@tiptap/core';
import { useEditor, UseEditorOptions } from '@tiptap/react';
import { useWatch } from '@verdant-web/react';
import { AnyEntity, ObjectEntity } from '@verdant-web/store';
import { useCallback, useEffect, useRef } from 'react';

type AllowedKey<Ent extends AnyEntity<any, any, any>> = Ent extends never
	? string
	: Ent extends AnyEntity<any, any, infer Shape>
		? keyof Shape
		: never;

type EntitySnapshot<
	Ent extends AnyEntity<any, any, any>,
	Key extends AllowedKey<Ent>,
> =
	Ent extends AnyEntity<any, any, infer Snap>
		? Key extends keyof Snap
			? Snap[Key]
			: any
		: never;

export function useSyncedEditor<
	Ent extends AnyEntity<any, any, any>,
	Key extends AllowedKey<Ent>,
>(
	parent: Ent,
	fieldName: Key,
	{
		editorOptions: extraOptions,
		editorDependencies,
		nullDocumentDefault,
	}: {
		editorOptions?: UseEditorOptions;
		editorDependencies?: any[];
		nullDocumentDefault?: EntitySnapshot<Ent, Key>;
	} = {},
) {
	const cachedOptions = useRef({
		nullDocumentDefault,
		fieldName,
	});
	cachedOptions.current = {
		nullDocumentDefault,
		fieldName,
	};
	const live = useWatch(parent);
	const field = live[fieldName] as ObjectEntity<any, any>;
	const updatingRef = useRef(false);
	const update = useCallback(
		(editor: Editor) => {
			if (updatingRef.current) {
				return;
			}

			const newData = editor.getJSON();
			const value = parent.get(cachedOptions.current.fieldName) as ObjectEntity<
				any,
				any
			> | null;
			if (!value) {
				parent.set(cachedOptions.current.fieldName as any, newData);
			} else {
				value.update(newData, {
					merge: false,
					dangerouslyDisableMerge: true,
					replaceSubObjects: false,
				});
			}
		},
		[parent],
	);

	const cachedInitialContent = useRef(
		ensureDocShape(getFieldSnapshot(field, nullDocumentDefault, fieldName)),
	);
	const editor = useEditor(
		{
			...extraOptions,
			content: cachedInitialContent.current,
			onUpdate: (ctx) => {
				update(ctx.editor);
				extraOptions?.onUpdate?.(ctx);
			},
		},
		[update, ...(editorDependencies ?? [])],
	);

	useEffect(() => {
		function updateFromField() {
			if (editor && !editor.isDestroyed) {
				updatingRef.current = true;
				const { from, to } = editor.state.selection;
				editor.commands.setContent(
					ensureDocShape(
						getFieldSnapshot(
							field,
							cachedOptions.current.nullDocumentDefault,
							cachedOptions.current.fieldName,
						),
					),
					false,
				);
				editor.commands.setTextSelection({ from, to });
				updatingRef.current = false;
			}
		}

		updateFromField();

		return field?.subscribe('changeDeep', (target, info) => {
			if (!info.isLocal || target === field) {
				updateFromField();
			}
		});
	}, [field, editor, cachedOptions]);

	return editor;
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
	const content = field ? field.getSnapshot() : (nullDocumentDefault ?? null);
	if (content === null) {
		throw new Error(`The provided field "${String(fieldName)}" is null and a default document was not provided.
		Please provide a default document or ensure the field is not null when calling useSyncedEditor, or make your
		field schema non-null and specify a default document there.`);
	}
	return content;
}
