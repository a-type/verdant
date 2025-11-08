import {
	ClientDescriptor,
	ClientWithCollections,
	createMigration,
	schema,
} from '@verdant-web/store';
import { Suspense } from 'react';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createHooks } from './hooks.js';

const testSchema = schema({
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

const hooks = createHooks(testSchema);

let clientDesc: ClientDescriptor;
let client: ClientWithCollections;
beforeAll(async () => {
	clientDesc = new ClientDescriptor({
		schema: testSchema,
		oldSchemas: [testSchema],
		migrations: [createMigration(testSchema)],
		namespace: 'suspense-test',
		log: console.log,
	});
	client = await (clientDesc.open() as Promise<ClientWithCollections>);
	await Promise.all(
		new Array(1000)
			.fill(null)
			.map((_, i) => client.posts.put({ content: `hello ${i}` })),
	);
});

afterAll(() => client.close());

function renderWithProvider(content: React.ReactElement) {
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

it('suspends when loading a query', async () => {
	const PostList = () => {
		const posts = hooks.useAllPosts();
		return (
			<div>
				{posts.map((post: any) => (
					<div key={post.id} data-testid="post">
						{post.content}
					</div>
				))}
			</div>
		);
	};

	const suspenseSpy = vi.fn();
	const Fallback = () => {
		suspenseSpy();
		return <div data-testid="suspense">Loading...</div>;
	};

	const { getByTestId } = renderWithProvider(
		<Suspense fallback={<Fallback />}>
			<PostList />
		</Suspense>,
	);

	expect(getByTestId('suspense')).toBeDefined();
	expect(suspenseSpy).toHaveBeenCalled();
});

it('does not suspend when a query was prewarmed', async () => {
	const PostList = () => {
		const posts = hooks.useAllPosts();
		return (
			<div>
				{posts.map((post: any) => (
					<div key={post.id} data-testid="post">
						{post.content}
					</div>
				))}
			</div>
		);
	};

	// prewarm the query
	await client.posts.findAll().resolved;

	const suspenseSpy = vi.fn();
	const Fallback = () => {
		suspenseSpy();
		return <div data-testid="suspense">Loading...</div>;
	};

	const { getByTestId } = renderWithProvider(
		<Suspense fallback={<Fallback />}>
			<PostList />
		</Suspense>,
	);

	expect(getByTestId('suspense')).not.toBeInTheDocument();
	expect(suspenseSpy).not.toHaveBeenCalled();
	expect(getByTestId('post').all().length).toBeGreaterThan(0);
});
