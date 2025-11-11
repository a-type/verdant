import {
	Client,
	ClientWithCollections,
	createMigration,
	schema,
} from '@verdant-web/store';
import { Suspense } from 'react';
import { afterAll, expect, it, vi } from 'vitest';
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

let clients: ClientWithCollections[] = [];
async function setup(namespace: string) {
	const client = new Client({
		schema: testSchema,
		oldSchemas: [testSchema],
		migrations: [createMigration(testSchema)],
		namespace: `${namespace}-${crypto.randomUUID()}`,
	}) as any as ClientWithCollections;
	await Promise.all(
		new Array(100)
			.fill(null)
			.map((_, i) =>
				client.posts.put({ content: `hello ${crypto.randomUUID()}` }),
			),
	);
	clients.push(client);
	return client;
}

afterAll(() => {
	return Promise.all(clients.map((client) => client.close()));
});

function renderWithProvider(
	content: React.ReactElement,
	client: ClientWithCollections,
) {
	return render(content, {
		wrapper: ({ children }) => (
			<hooks.Provider value={client}>
				<Suspense>{children}</Suspense>
			</hooks.Provider>
		),
	});
}

it('suspends when loading a query', async () => {
	const client = await setup('suspense-test');
	const PostList = () => {
		const posts = hooks.useAllPosts({
			key: 'suspended-posts',
		});
		return (
			<div>
				{posts.map((post: any) => (
					<div key={post.uid} data-testid="suspended-post">
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

	const { getByTestId } = await renderWithProvider(
		<Suspense fallback={<Fallback />}>
			<PostList />
		</Suspense>,
		client,
	);

	await expect.element(getByTestId('suspense')).toBeDefined();
	expect(suspenseSpy).toHaveBeenCalled();

	await expect.element(getByTestId('suspended-post').first()).toBeDefined();
	expect(getByTestId('suspended-post').all().length).toBe(100);
});

it('does not suspend when a query was prewarmed', async () => {
	const client = await setup('suspense-prewarm-test');
	const PostList = () => {
		const posts = hooks.useAllPosts({
			key: 'prewarmed-posts',
		});
		return (
			<div>
				{posts.map((post: any) => (
					<div key={post.uid} data-testid="prewarmed-post">
						{post.content}
					</div>
				))}
			</div>
		);
	};

	// prewarm the query
	client.queries.keepAlive('prewarmed-posts');
	await client.posts.findAll({
		key: 'prewarmed-posts',
	}).resolved;

	const suspenseSpy = vi.fn();
	const Fallback = () => {
		suspenseSpy();
		return <div data-testid="suspense">Loading...</div>;
	};

	const { getByTestId } = await renderWithProvider(
		<Suspense fallback={<Fallback />}>
			<PostList />
		</Suspense>,
		client,
	);

	await expect.element(getByTestId('suspense')).not.toBeInTheDocument();
	expect(suspenseSpy).not.toHaveBeenCalled();
	expect(getByTestId('prewarmed-post').all().length).toBe(100);
});
