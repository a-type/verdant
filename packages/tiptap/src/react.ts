import { useEditor, UseEditorOptions } from '@tiptap/react';
import { AnyEntity } from '@verdant-web/store';
import { useRef, useState } from 'react';
import {
	VerdantExtension,
	VerdantExtensionOptions,
	type EntitySnapshot,
	type ValidEntityKey,
} from './plugins.js';

export function useSyncedEditor<
	Ent extends AnyEntity<any, any, any>,
	Key extends ValidEntityKey<Ent>,
>(
	parent: Ent,
	fieldName: Key,
	{
		editorOptions: extraOptions,
		editorDependencies,
		nullDocumentDefault,
		extensionOptions,
	}: {
		editorOptions?: UseEditorOptions;
		editorDependencies?: any[];
		nullDocumentDefault?: EntitySnapshot<Ent, Key>;
		extensionOptions?: Partial<VerdantExtensionOptions>;
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
		VerdantExtension.configure({
			parent,
			fieldName: fieldName as string | number,
			nullDocumentDefault,
			...extensionOptions,
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
