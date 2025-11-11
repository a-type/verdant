import { EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { createMigration, schema } from '@verdant-web/common';
import { createHooks } from '@verdant-web/react';
import { Client, ClientWithCollections } from '@verdant-web/store';
import { ChangeEvent, ReactNode, Suspense } from 'react';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import {
	createTipTapFieldSchema,
	createTipTapFileMapSchema,
} from '../fields.js';
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
				files: createTipTapFileMapSchema(),
			},
		}),
	},
});

const hooks = createHooks(testSchema);

function safeLogger(level: string, ...args: any[]) {
	try {
		if (args.some((arg) => typeof arg === 'string' && arg.includes('Redo')))
			console.debug(
				...args.map((arg) =>
					typeof arg === 'object' ? JSON.stringify(arg, undefined, ' ') : arg,
				),
			);
	} catch (err) {
		console.debug(...args);
	}
}

let client: ClientWithCollections;
beforeAll(async () => {
	client = new Client({
		schema: testSchema,
		oldSchemas: [testSchema],
		migrations: [createMigration(testSchema)],
		namespace: 'tiptatp-test',
		// log: safeLogger,
	}) as any as ClientWithCollections;
});

afterAll(() => client.close());

function renderWithProvider(content: ReactNode) {
	return render(content, {
		wrapper: ({ children }) => (
			<Suspense>
				<hooks.Provider value={client}>
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
						content: null,
						marks: null,
						from: null,
						to: null,
						text: 'Hello, world!',
					},
				],
				marks: null,
				from: null,
				to: null,
				text: null,
			},
		],
		marks: null,
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
						content: null,
						marks: null,
						from: null,
						to: null,
						text: 'Hello, world!',
					},
				],
				marks: null,
				from: null,
				to: null,
				text: null,
			},
		],
		marks: null,
		text: null,
	});
});

it('should support Verdant undo and redo', async () => {
	const testPost = await client.posts.put({});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: {
				extensions: [
					StarterKit.configure({
						// using Verdant history.
						history: false,
					}),
				],
			},
			// NOTE: this config is not required in regular usage, I'm tweaking batching
			// to be sure it captures the entire testing change in one batch for undo to
			// make the test predictable.
			extensionOptions: {
				batchConfig: {
					// capture up to 100 changes in the batch.
					max: 100,
					timeout: null,
					batchName: 'tiptap',
					undoable: true,
				},
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

	await client.entities.flushAllBatches();

	expect(client.undoHistory.undoLength).toBe(1);
	await client.undoHistory.undo();

	expect(testPost.get('requiredBody').getSnapshot()).toEqual({
		type: 'doc',
		attrs: {},
		from: null,
		to: null,
		content: [],
		marks: null,
		text: null,
	});
});

it('should support TipTap undo and redo', async () => {
	const testPost = await client.posts.put({});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: {
				extensions: [StarterKit],
			},
			extensionOptions: {
				batchConfig: {
					undoable: false,
				},
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
				<button data-testid="undo" onClick={() => editor!.commands.undo()}>
					Undo
				</button>
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

	await client.entities.flushAllBatches();

	// Verdant did not capture the change in undo history.
	expect(client.undoHistory.undoLength).toBe(0);

	await userEvent.click(screen.getByTestId('undo'));
	await expect.element(editor).toHaveTextContent('');

	// notably, TipTap history doesn't seem to remove the paragraph node,
	// but to the user this behaves as expected.
	expect(testPost.get('requiredBody').getSnapshot()).toEqual({
		type: 'doc',
		attrs: {},
		from: null,
		to: null,
		content: [
			{
				attrs: {},
				content: null,
				from: null,
				marks: null,
				text: null,
				to: null,
				type: 'paragraph',
			},
		],
		marks: null,
		text: null,
	});
});

it('should initialize from an existing document', async () => {
	const testPost = await client.posts.put({
		requiredBody: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Hello, world!',
						},
					],
				},
			],
		},
	});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: {
				extensions: [StarterKit.configure({ history: false })],
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
	await expect.element(editor).toHaveTextContent('Hello, world!');
});

function testLog(...args: any[]) {
	console.debug('[TEST]', ...args);
}

it('should withstand multiple edits, undo, and redo consistently', async () => {
	const testPost = await client.posts.put({
		requiredBody: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Hello, world!',
						},
					],
				},
			],
		},
	});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: {
				extensions: [StarterKit.configure({ history: false })],
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
	await expect.element(editor).toHaveTextContent('Hello, world!');

	await userEvent.type(editor, '[pageDown]');
	await userEvent.type(editor, '\nLine 2!');

	await client.entities.flushAllBatches();

	await userEvent.type(editor, '\nLine 3!');

	await client.entities.flushAllBatches();

	expect(client.undoHistory.canUndo).toBe(true);

	await client.undoHistory.undo();
	await client.entities.flushAllBatches();

	await expect.element(editor).toHaveTextContent(/^Hello, world!Line 2!$/);

	await client.undoHistory.redo();
	await client.entities.flushAllBatches();

	await expect
		.element(editor)
		.toHaveTextContent(/^Hello, world!Line 2!Line 3!$/);

	await client.undoHistory.undo();
	await client.entities.flushAllBatches();

	await expect.element(editor).toHaveTextContent(/^Hello, world!Line 2!$/);

	// I've noticed some strangeness when restoring a deleted block
	// when the editor is not on the same line as the deletion,
	// not sure if this is actually related to cursor position but
	// testing anyway.
	await userEvent.type(editor, '[arrowUp]');

	await client.undoHistory.redo();
	await client.entities.flushAllBatches();

	await expect
		.element(editor)
		.toHaveTextContent(/^Hello, world!Line 2!Line 3!$/);
});

it('should support media nodes', async () => {
	const testPost = await client.posts.put({});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const user = userEvent.setup();

	const TipTapTest = () => {
		const editor = useSyncedEditor(testPost, 'requiredBody', {
			editorOptions: {
				extensions: [StarterKit.configure({ history: false })],
			},
			files: testPost.get('files'),
		});

		const insertMedia = async (ev: ChangeEvent<HTMLInputElement>) => {
			const file = ev.currentTarget.files?.[0];
			if (!file) return;
			editor?.chain().insertMedia(file).run();
		};

		return (
			<div>
				<input type="file" onChange={insertMedia} data-testid="insert-media" />
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

	// load the image fixture to a file
	const imageRes = await fetch('/cat.jpg', { method: 'GET' });
	const imageBlob = await imageRes.blob();

	const screen = await renderWithProvider(<TipTapTest />);
	await expect.element(screen.getByTestId('editor')).toBeVisible();

	const editor = screen.getByTestId('editor').getByRole('textbox');
	await expect.element(editor).toHaveTextContent('');

	// send keystrokes to the editor
	await user.type(editor, 'Hello, world!');
	await expect.element(editor).toHaveTextContent('Hello, world!');

	// simulate paste of an image
	// load the image into the clipboard
	await user.upload(
		screen.getByTestId('insert-media'),
		new File([imageBlob], 'cat.jpg', { type: 'image/jpeg' }),
	);

	// the image should be visible in the editor
	await expect.element(screen.getByRole('img')).toBeVisible();

	const audioRes = await fetch('/cat.m4a', { method: 'GET' });
	const audioBlob = await audioRes.blob();
	await user.upload(
		screen.getByTestId('insert-media'),
		new File([audioBlob], 'cat.m4a', { type: 'audio/m4a' }),
	);

	// the audio should be visible in the editor
	const audio = screen.container.querySelector('audio');
	expect(audio).not.toBe(null);
	await expect.element(audio!).toBeVisible();

	const videoRes = await fetch('/cat.mp4', { method: 'GET' });
	const videoBlob = await videoRes.blob();
	await user.upload(
		screen.getByTestId('insert-media'),
		new File([videoBlob], 'cat.mp4', { type: 'video/mp4' }),
	);

	// the video should be visible in the editor
	const video = screen.container.querySelector('video');
	expect(video).not.toBe(null);
	await expect.element(video!).toBeVisible();

	const files = testPost.get('files');
	expect(files.values().length).toBe(3);

	// delete all media nodes; the files should also be removed from Verdant.
	await user.keyboard('{Delete}{Delete}{Delete}');
	await expect
		.element(screen.getByTestId('editor'))
		.toHaveTextContent('Hello, world!');
	expect(files.values().length).toBe(0);
});

it('can re-render with a different backing entity', async () => {
	const testPost = await client.posts.put({
		requiredBody: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Hello, world!',
						},
					],
				},
			],
		},
	});
	const testPost2 = await client.posts.put({
		requiredBody: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Goodbye, world!',
						},
					],
				},
			],
		},
	});

	// reset history
	await client.entities.flushAllBatches();
	client.undoHistory.clear();

	const user = userEvent.setup();

	const TipTapTest = ({ post }: { post: any }) => {
		const editor = useSyncedEditor(post, 'requiredBody', {
			editorOptions: {
				extensions: [StarterKit.configure({ history: false })],
			},
			files: post.get('files'),
		});

		const insertMedia = async (ev: ChangeEvent<HTMLInputElement>) => {
			const file = ev.currentTarget.files?.[0];
			if (!file) return;
			editor?.chain().insertMedia(file).run();
		};

		return (
			<div>
				<input type="file" onChange={insertMedia} data-testid="insert-media" />
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

	const screen = await renderWithProvider(<TipTapTest post={testPost} />);
	await expect.element(screen.getByTestId('editor')).toBeVisible();
	await expect
		.element(screen.getByTestId('editor'))
		.toHaveTextContent('Hello, world!');

	screen.rerender(<TipTapTest post={testPost2} />);
	await expect.element(screen.getByTestId('editor')).toBeVisible();
	await expect
		.element(screen.getByTestId('editor'))
		.toHaveTextContent('Goodbye, world!');
});
