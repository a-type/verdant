import { EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { createMigration, schema } from '@verdant-web/common';
import { createHooks } from '@verdant-web/react';
import { ClientDescriptor, ClientWithCollections } from '@verdant-web/store';
import { userEvent } from '@vitest/browser/context';
import { ReactNode, Suspense } from 'react';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { createTipTapFieldSchema } from '../fields.js';
import { useSyncedEditor } from '../react.js';

const testSchema = schema({
	version: 1,
	collections: {
		posts: schema.collection({
			name: 'post',
			primaryKey: 'id',
			fields: {
				id: schema.fields.id(),
				nullableBody: createTipTapFieldSchema({ default: null }),
				requiredBody: createTipTapFieldSchema({
					default: {
						type: 'doc',
						content: [],
					},
				}),
			},
		}),
	},
});

const hooks = createHooks(testSchema);

let clientDesc: ClientDescriptor;
let client: ClientWithCollections;
beforeAll(async () => {
	clientDesc = new ClientDescriptor({
		schema: testSchema,
		oldSchemas: [testSchema],
		migrations: [createMigration(testSchema)],
		namespace: 'tiptatp-test',
	});
	client = await (clientDesc.open() as Promise<ClientWithCollections>);
});

afterAll(() => client.close());

function renderWithProvider(content: ReactNode) {
	return render(content, {
		wrapper: ({ children }) => (
			<Suspense>
				<hooks.Provider value={clientDesc}>
					<Suspense fallback={<div data-testid="suspense">Loading...</div>}>
						{children}
					</Suspense>
				</hooks.Provider>
			</Suspense>
		),
	});
}

it('should support non-nullable tiptap schema fields', async () => {
	const testPost = await client.posts.put({});

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: { extensions: [StarterKit] },
		});

		return (
			<div>
				<div>Text editor:</div>
				<EditorContent
					style={{
						width: 500,
						height: 300,
					}}
					editor={editor}
					id="#editor"
					data-testid="editor"
				/>
			</div>
		);
	};

	const screen = await renderWithProvider(<TipTapTest />);
	await expect.element(screen.getByTestId('editor')).toBeVisible();

	const editor = screen.getByTestId('editor').getByRole('textbox');
	await expect.element(editor).toHaveTextContent('');

	// send keystrokes to the editor
	await userEvent.type(editor, 'Hello, world!');
	await expect.element(editor).toHaveTextContent('Hello, world!');

	expect(testPost.get('requiredBody').getSnapshot()).toEqual({
		type: 'doc',
		attrs: {},
		from: null,
		to: null,
		content: [
			{
				type: 'paragraph',
				attrs: {},
				content: [
					{
						type: 'text',
						attrs: {},
						content: [],
						marks: [],
						from: null,
						to: null,
						text: 'Hello, world!',
					},
				],
				marks: [],
				from: null,
				to: null,
				text: null,
			},
		],
		marks: [],
		text: null,
	});
});

it('should support nullable tiptap schema fields with a specified default doc', async () => {
	const testPost = await client.posts.put({});

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'nullableBody', {
			editorOptions: { extensions: [StarterKit] },
			nullDocumentDefault: {
				type: 'doc',
				content: [],
			},
		});

		return (
			<div>
				<div>Text editor:</div>
				<EditorContent
					style={{
						width: 500,
						height: 300,
					}}
					editor={editor}
					id="#editor"
					data-testid="editor"
				/>
			</div>
		);
	};

	const screen = await renderWithProvider(<TipTapTest />);
	await expect.element(screen.getByTestId('editor')).toBeVisible();

	const editor = screen.getByTestId('editor').getByRole('textbox');
	await expect.element(editor).toHaveTextContent('');

	// send keystrokes to the editor
	await userEvent.type(editor, 'Hello, world!');
	await expect.element(editor).toHaveTextContent('Hello, world!');

	expect(testPost.get('nullableBody').getSnapshot()).toEqual({
		type: 'doc',
		attrs: {},
		from: null,
		to: null,
		content: [
			{
				type: 'paragraph',
				attrs: {},
				content: [
					{
						type: 'text',
						attrs: {},
						content: [],
						marks: [],
						from: null,
						to: null,
						text: 'Hello, world!',
					},
				],
				marks: [],
				from: null,
				to: null,
				text: null,
			},
		],
		marks: [],
		text: null,
	});
});
