import { useEditor, UseEditorOptions } from '@tiptap/react';
import { AnyEntity } from '@verdant-web/store';
import { useRef, useState } from 'react';
import { VerdantOidExtension } from './plugins.js';

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
		// TODO: use editor undo instead of Verdant. will require somehow getting
		// a Store reference from here
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
	// create a configured version of the Verdant extension, which handles
	// the actual syncing of the editor content to the field
	const [extension] = useState(() =>
		VerdantOidExtension.configure({
			parent,
			fieldName: fieldName as string | number,
			nullDocumentDefault,
		}),
	);
	const editor = useEditor(
		{
			...extraOptions,
			onContentError(props) {
				console.error('Content error:', props.error);
			},
			extensions: [extension, ...(extraOptions?.extensions ?? [])],
		},
		editorDependencies,
	);

	return editor;
}
