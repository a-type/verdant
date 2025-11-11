import {
	Client,
	ClientWithCollections,
	createMigration,
	schema,
} from '@verdant-web/store';
import { Suspense } from 'react';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { createHooks } from './hooks.js';

export const testSchema = schema({
	version: 1,
	collections: {
		posts: schema.collection({
			name: 'post',
			primaryKey: 'id',
			fields: {
				id: schema.fields.id(),
				content: schema.fields.string({ default: '' }),
				comments: schema.fields.array({
					items: schema.fields.object({
						properties: {
							id: schema.fields.id(),
							content: schema.fields.string({ default: '' }),
						},
					}),
				}),
				attachment: schema.fields.file({ nullable: true }),
			},
		}),
	},
});

export const hooks = createHooks(testSchema);

let client: ClientWithCollections;
beforeAll(async () => {
	client = new Client({
		schema: testSchema,
		oldSchemas: [testSchema],
		migrations: [createMigration(testSchema)],
		namespace: 'watch-test',
		log: console.log,
	}) as any as ClientWithCollections;
});

afterAll(() => client.close());

function renderWithProvider(content: React.ReactElement) {
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

it('should only re-render when observed keys change', async () => {
	// seed the initial post
	const testPost = await client.posts.put({});

	let renderCount = 0;

	const ObserverTest = () => {
		const { content } = hooks.useWatch(testPost);

		renderCount++;

		return (
			<div>
				<div data-testid="content">{content}</div>
			</div>
		);
	};

	const screen = await renderWithProvider(<ObserverTest />);
	await expect.element(screen.getByTestId('content')).toBeInTheDocument();

	// record initial render count
	const initialRenderCount = renderCount;

	// when changing content, the component should re-render
	testPost.set('content', 'hello world');

	await expect
		.element(screen.getByTestId('content'))
		.toHaveTextContent('hello world');
	expect(renderCount).toBeGreaterThan(initialRenderCount);

	const updatedRenderCount = renderCount;

	// when changing comments, the component should not re-render
	testPost.set('comments', [{ id: '1', content: 'comment' }]);

	await expect
		.element(screen.getByTestId('content'))
		.toHaveTextContent('hello world');
	expect(renderCount).toBe(updatedRenderCount);
});

it('should support files', async () => {
	// seed the initial post
	const testPost = await client.posts.put({
		attachment: new File([''], 'test.txt', { type: 'text/plain' }),
	});
	const testFile = testPost.get('attachment');

	const FileTest = () => {
		const url = hooks.useWatch(testFile);

		return (
			<div>
				<div data-testid="file">{url}</div>
			</div>
		);
	};

	const screen = await renderWithProvider(<FileTest />);
	await expect.element(screen.getByTestId('file')).toHaveTextContent('blob:');
});

it('should support deep watching', async () => {
	// seed the initial post
	const testPost = await client.posts.put({
		comments: [{ content: 'comment' }],
	});

	const DeepTest = () => {
		const { comments } = hooks.useWatch(testPost, { deep: true });

		return (
			<div>
				<div data-testid="comments">
					{comments.map((c: any) => c.get('content')).join(', ')}
				</div>
			</div>
		);
	};

	const screen = await renderWithProvider(<DeepTest />);

	await expect
		.element(screen.getByTestId('comments'))
		.toHaveTextContent('comment');

	// when changing content, the component should re-render
	testPost.get('comments').push({ content: 'hello world' });

	await expect
		.element(screen.getByTestId('comments'))
		.toHaveTextContent('comment, hello world');
});

it('should handle null entities', async () => {
	const Test = () => {
		hooks.useWatch(null);

		return (
			<div>
				<div data-testid="content" />
			</div>
		);
	};

	const screen = await renderWithProvider(<Test />);
	await expect.element(screen.getByTestId('content')).toBeEmptyDOMElement();
});

it('should handle documents being deleted', async () => {
	const docId = 'test-id';
	// TODO: rework this to use actual hook queries once https://github.com/vitest-dev/vitest-browser-react/issues/9
	// is addressed upstream.
	let testPost: any = null;

	const DeleteTest = ({ post }: { post: any }) => {
		hooks.useWatch(post);

		if (post) {
			return <div data-testid="content">{post.get('content')}</div>;
		}

		return <div data-testid="content" />;
	};

	const screen = await renderWithProvider(<DeleteTest post={testPost} />);
	await expect.element(screen.getByTestId('content')).toBeEmptyDOMElement();

	testPost = await client.posts.put({ id: docId, content: 'hello' });
	await screen.rerender(<DeleteTest post={testPost} />);

	await expect
		.element(screen.getByTestId('content'))
		.toHaveTextContent('hello');

	await client.posts.delete(docId);
	testPost = null;
	await screen.rerender(<DeleteTest post={testPost} />);

	await expect.element(screen.getByTestId('content')).toBeEmptyDOMElement();

	testPost = await client.posts.put({ id: docId, content: 'world' });
	await screen.rerender(<DeleteTest post={testPost} />);

	await expect
		.element(screen.getByTestId('content'))
		.toHaveTextContent('world');

	// it reacts to changes on the document
	testPost.set('content', 'hello');

	await expect
		.element(screen.getByTestId('content'))
		.toHaveTextContent('hello');
});
