import { useEditor, UseEditorOptions } from '@tiptap/react';
import { AnyEntity } from '@verdant-web/store';
import { useMemo, useRef } from 'react';
import {
	VerdantExtension,
	VerdantExtensionOptions,
	type EntitySnapshot,
	type ValidEntityKey,
} from './extensions/Verdant.js';
import {
	VerdantMediaExtension,
	VerdantMediaFileMap,
} from './extensions/VerdantMedia.js';

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
		files,
	}: {
		editorOptions?: UseEditorOptions;
		editorDependencies?: any[];
		nullDocumentDefault?: EntitySnapshot<Ent, Key>;
		extensionOptions?: Partial<VerdantExtensionOptions>;
		files?: VerdantMediaFileMap;
	} = {},
) {
	const cachedOptions = useRef({
		nullDocumentDefault,
		extensionOptions,
	});
	cachedOptions.current = {
		nullDocumentDefault,
		extensionOptions,
	};
	// create a configured version of the Verdant extension, which handles
	// the actual syncing of the editor content to the field
	const extensions = useMemo(
		() =>
			[
				VerdantExtension.configure({
					parent,
					fieldName: fieldName as string | number,
					nullDocumentDefault,
					...cachedOptions.current.extensionOptions,
				}),
				files
					? VerdantMediaExtension.configure({
							fileMap: files,
						})
					: undefined,
			].filter((v) => !!v),
		[fieldName, parent, files],
	);
	const editor = useEditor(
		{
			...extraOptions,
			onContentError(props) {
				console.error('Content error:', props.error);
			},
			extensions: [...extensions, ...(extraOptions?.extensions ?? [])],
		},
		[...extensions, ...(editorDependencies ?? [])],
	);

	return editor;
}
