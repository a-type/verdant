import { it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { collection, createMigration, schema } from '@verdant-web/common';
import { ClientWithCollections } from '@verdant-web/store';
import { waitForEntityCondition } from '../lib/waits.js';

const context = createTestContext();

it('applies successive updates to a nested document in a tiptap-like scenario', async () => {
	const documents = collection({
		name: 'document',
		primaryKey: 'id',
		fields: {
			id: {
				type: 'string',
				default: () => Math.random().toString(36).slice(2, 9),
			},
			content: { type: 'any' },
		},
	});
	const testSchema = schema({
		version: 1,
		collections: {
			documents,
		},
	});
	const client = (await context.createTestClient({
		schema: testSchema,
		migrations: [createMigration(testSchema)],
		library: 'tiptap',
		user: 'A',
	})) as unknown as ClientWithCollections;
	client.sync.start();

	const doc = await client.documents.put({
		content: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					attrs: { id: '1' },
					content: [{ type: 'text', text: '' }],
				},
			],
		},
	});
	let text = '';
	for (let i = 0; i < 100; i++) {
		text += 'a';
		doc.get('content').update(
			{
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						attrs: { id: '1' },
						content: [{ type: 'text', text }],
					},
				],
			},
			{
				merge: false,
				replaceSubObjects: false,
			},
		);
		// mimic typing delay
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	await waitForEntityCondition(
		doc,
		(doc) =>
			doc
				.get('content')
				.get('content')
				.get(0)
				.get('content')
				.get(0)
				.get('text') === text,
	);
});
