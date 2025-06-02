import {
	cloneDeep,
	collection,
	createMigration,
	schema,
	stableStringify,
} from '@verdant-web/common';
import { ClientWithCollections, getEntityClient, id } from '@verdant-web/store';
import {
	createTipTapFieldSchema,
	TipTapDocumentEntity,
} from '@verdant-web/tiptap';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForQueryResult,
	waitForSync,
} from '../lib/waits.js';

const context = createTestContext({
	// keepDb: true,
});

const documents = collection({
	name: 'document',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		content: createTipTapFieldSchema({
			default: {
				type: 'doc',
				content: [],
			},
		}),
	},
});
const testSchema = schema({
	version: 1,
	collections: {
		documents,
	},
});

it('applies successive updates to a nested document in a tiptap-like scenario', async () => {
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
		// the real TipTap extension is fairly optimized to make targetted changes,
		// this mimics that by reusing the snapshot and only updating the text
		text += 'a';
		const snapshot = doc.get('content').getSnapshot();
		snapshot.content![0].content![0].text = text;
		doc.get('content').update(snapshot, {
			merge: false,
			dangerouslyDisableMerge: true,
			replaceSubObjects: false,
		});
		// mimic typing delay
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	await waitForEntityCondition(
		doc,
		(doc) =>
			doc
				.get('content')
				.get('content')
				?.get(0)
				?.get('content')
				?.get(0)
				?.get('text') === text,
		20000,
		'waiting for text to be updated',
	);
});

it('handles concurrent structural changes to a document in a tiptap-like scenario', async () => {
	const clientA = await context.createTestClient({
		schema: testSchema,
		migrations: [createMigration(testSchema)],
		library: 'tiptap-collab',
		user: 'A1',
	});
	await clientA.sync.start();
	const docA = await clientA.documents.put({});
	await waitForSync(clientA);

	const clientB = await context.createTestClient({
		schema: testSchema,
		migrations: [createMigration(testSchema)],
		library: 'tiptap-collab',
		user: 'B1',
	});
	clientB.sync.start();
	await waitForSync(clientB);
	await waitForQueryResult(clientB.documents.get(docA.get('id')));
	const docB = await clientB.documents.get(docA.get('id')).resolved!;

	// these changes should be independent of one another, although the final ordering
	// of the paragraphs is not guaranteed.

	// rather than simulating user timing to produce realistic batches (and messing with fake timers, etc)
	// I'm going to use small batch limits to achieve something similar.
	function inBatch(doc: TipTapDocumentEntity, fn: () => void) {
		const client = getEntityClient(doc);
		client
			.batch({ undoable: true, max: 12, timeout: null, batchName: id() })
			.run(fn)
			.commit();
	}

	// other helpers to simulate tiptap behavior
	function textNode(text: string) {
		return {
			type: 'text',
			text,
			marks: [],
			attrs: {},
			content: null,
			from: null,
			to: null,
		};
	}
	function paragraphNode(content: any[]) {
		return {
			type: 'paragraph',
			attrs: {},
			content,
			marks: [],
			from: null,
			to: null,
			text: null,
		};
	}

	async function addParagraph(doc: TipTapDocumentEntity, text: string) {
		inBatch(doc, () => {
			let snap = cloneDeep(doc.getSnapshot());
			snap.content!.push(paragraphNode([textNode('')]));
			doc.update(snap, {
				dangerouslyDisableMerge: true,
				merge: false,
			});
			snap = cloneDeep(doc.getSnapshot());
			for (const letter of text) {
				snap.content![snap.content!.length - 1].content![0].text += letter;
				doc.update(snap, {
					dangerouslyDisableMerge: true,
					merge: false,
				});
			}
		});
	}

	async function extendParagraph(
		doc: TipTapDocumentEntity,
		originalText: string,
		moreText: string,
	) {
		await waitForEntityCondition(
			doc,
			(doc) =>
				doc
					.get('content')
					.some((p) =>
						p.get('content').some((t) => t.get('text') === originalText),
					),
			10000,
			`waiting for paragraph with text "${originalText}"`,
		);
		inBatch(doc, () => {
			let snap = cloneDeep(doc.getSnapshot());
			const para = snap.content!.find(
				(node) => node.content![0].text === originalText,
			);
			if (!para) {
				throw new Error('paragraph not found');
			}
			for (const letter of moreText) {
				para.content![0].text += letter;
				doc.update(snap, {
					dangerouslyDisableMerge: true,
					merge: false,
				});
			}
		});
	}

	async function removeParagraph(doc: TipTapDocumentEntity, text: string) {
		await waitForEntityCondition(
			doc,
			(doc) =>
				doc
					.get('content')
					.some((p) => p.get('content').some((t) => t.get('text') === text)),
			10000,
			`waiting for paragraph with text "${text}"`,
		);
		inBatch(doc, () => {
			let snap = cloneDeep(doc.getSnapshot());
			const idx = snap.content!.findIndex(
				(node) => node.content![0].text === text,
			);
			if (idx === -1) {
				throw new Error('paragraph not found');
			}
			snap.content!.splice(idx, 1);
			doc.update(snap, {
				dangerouslyDisableMerge: true,
				merge: false,
			});
		});
	}

	// now, concurrently add and remove paragraphs. intentionally overlapping and altering
	// each others stuff
	const contentA = docA.get('content');
	const contentB = docB.get('content');

	await Promise.all([
		(async () => {
			await addParagraph(contentA, 'A paragraph from A');
			await addParagraph(contentA, 'Another paragraph from A');
			await removeParagraph(contentA, 'Another paragraph from B');
		})(),
		(async () => {
			await addParagraph(contentB, 'A paragraph from B');
			await addParagraph(contentB, 'Another paragraph from B');
			await extendParagraph(
				contentB,
				'A paragraph from B',
				' and some more text',
			);
			await extendParagraph(
				contentB,
				'A paragraph from A',
				' and extra from B',
			);
			await removeParagraph(contentB, 'Another paragraph from A');
			await clientB.undoHistory.undo();
		})(),
	]);

	await waitForEntityCondition(
		contentA,
		(doc) => doc.get('content').length === 3,
	);
	await waitForEntityCondition(
		contentB,
		(doc) => doc.get('content').length === 3,
	);

	await waitForCondition(() => {
		const snapA = contentA.getSnapshot();
		const snapB = contentB.getSnapshot();
		return stableStringify(snapA) === stableStringify(snapB);
	});
	expect(contentA.getSnapshot()).toEqual(contentB.getSnapshot());
	// let's also ensure the expected content exists.
	const snap = contentA.getSnapshot();
	expect(
		snap.content!.some(
			(p: any) => p.content![0].text === 'A paragraph from A and extra from B',
		),
	);
	expect(
		snap.content!.some(
			(p: any) =>
				p.content![0].text === 'A paragraph from B and some more text',
		),
	);
	expect(
		snap.content!.some(
			(p: any) => p.content![0].text === 'Another paragraph from A',
		),
	);
});
