---
sidebar_position: 0
---

# TipTap Text Editor

An experimental integration is available for integrating Verdant with the [TipTap rich text editor](https://tiptap.dev). Currently this integration provides a premade Verdant field schema for a TipTap document which enforces correct (but generic) shape, and a React hook to instantiate a Verdant-synced TipTap Editor instance with one line.

Verdant **does not currently support simultaneous text editing**, so don't expect a magical experience here. Use of Verdant with TipTap is mostly recommended for single-user use cases. Otherwise, you will probably want to use [presence](../sync/presence.md) to lock text blocks while another user is editing them to avoid conflicts. Collaboration should work fairly well as long as users don't try to modify the same string at the same time.

## Creating a TipTap document schema field

You can construct a schema for a field which represents a text document by importing `createTipTapFieldSchema` and passing the result to your schema field.

```ts
import { schema } from '@verdant-web/store';
import { createTipTapFieldSchema } from '@verdant-web/tiptap';

export default schema({
	version: 1,
	collections: {
		posts: schema.collection({
			name: 'post',
			primaryKey: 'id',
			fields: {
				id: schema.fields.id(),
				body: createTipTapFieldSchema({
					default: {
						type: 'doc',
						content: [],
					},
				}),
			},
		}),
	},
});
```

You are required to specify a default document value. This can be `null`, which will make your field nullable. If it's not null, it must at least have `type` (the type of the root document node). You can also specify `content` (an array of child nodes), `attrs` (a record, where values can be anything), and `text` (if your root node is a text node -- unlikely). The above example is recommended.

If you pass `null`, your field will begin as `null` unless otherwise specified. If the user adds a document to the field, you are responsible for ensuring the initial state of that document. See `nullDocumentDefault` in `useSyncedEditor` below.

## Using the TipTap Extension

Verdant ships a TipTap extension which handles syncing your document to a document field on an entity. You must import the extension from the library and configure it with your field data.

For additional type safety, there's also a helper function exported called `createVerdantExtension`, which enforces that the field you select is actually part of the schema of the entity you provide. I recommend using this so that changes in your document structure don't silently break your TipTap editor.

```tsx
import { createVerdantExtension } from '@verdant-web/tiptap';
import { Editor } from '@tiptap/core';

// suppose we have a Verdant entity which has a tiptap field
// assigned to the 'document' field name in the schema...
const parentEntity = await client.posts.get('some-post-id');

const editor = new Editor({
	// ... other options ...
	extensions: [
		createVerdantExtension(
			// first, we pass the parent entity
			parentEntity,
			// then, the field name where the tiptap document is located
			'document',
			{
				// optional additional configuration
				nullDocumentDefault: ...,
				batchConfig: {
					batchName: 'tiptap',
					max: 100,
					timeout: 1000,
					undoable: false,
				}
			},
		),
	],
});
```

When the extension is added, it will take care of diffing and synchronizing the TipTap editor data to your Verdant storage. It doesn't do presence or cursors (yet?).

Under the hood, this extension is also doing its best to track the identities of the nodes in your document, so that the diffing algorithm can preserve node identity during changes wherever possible. Due to limitations in the TipTap/Prosemirror model around inline nodes, however, this only works with block-level nodes like paragraphs. Any changes to the actual text in a `text` node will fully overwrite the previous contents of that node when merged, using last-write-wins.

I hope to improve the diffing of the extension over time.

### Why `parent` and `fieldName`?

It may seem a little strange or awkward to require passing the parent of the actual TipTap field instead of just the field directly. While the API is a little odd, it's designed for resiliency. By having a reference to the parent, the extension is able to fully initialize and assign a brand new document while seamlessly tracking changes as needed. This is mostly relevant if your document field is nullable: if the value is `null`, a new document will be initialized for you when the user begins typing in the editor.

To that end, if your field _is_ nullable with no default document shape, you **must** pass the `nullDocumentDefault` to the extension options. The extension will enforce this at runtime. This gives it the appropriate document shape when filling in the missing field value.

## A note on Undo/Redo

TipTap's [Starter Kit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) extension includes the [Undo/Redo](https://tiptap.dev/docs/editor/extensions/functionality/undo-redo) extension by default. **This will conflict with Verdant's built-in Undo/Redo behavior**. You should choose one, but they both work!

### Using Verdant's Undo/Redo

Using Verdant for undo history is recommended if you want to seamlessly integrate undo history with other changes outside your TipTap editor, like if your user is going back and forth between the editor and other parts of the app, or if a feature in your editor modifies data outside the document (like a button which modifies some other part of an entity).

To use Verdant's undo history, make sure you turn off TipTap's history if you are using the Starter Kit:

```ts
const editor = new Editor({
	// ... other options ...
	extensions: [
		StarterKit.configure({
			// Turn off TipTap's undo history.
			history: false,
		}),
		createVerdantExtension(parentEntity, 'document'),
	],
});
```

You can also configure how Verdant batches your edits into undo items via extension options using the `batchConfig` key. These use the same options as `client.batch`. See [batching docs](../local-storage/undo.md#configuring-timeout-or-max-item-count). However, this does not expose any way to do semantic batching; Verdant doesn't understand "rich text document" and may arbitrarily batch portions of a paragraph in separate commits.

### Using TipTap's Undo/Redo

You can instead turn off Verdant's undo tracking and rely on TipTap's undo behavior. This might be better if your experience is solely focused on text editing. Changes produced by TipTap's built-in undo will be consumed as normal diff changes to the Verdant data as they are emitted.

You may see improvements to the semantic undo behavior with this approach as TipTap is more likely to have tuned their undo partitioning to match user expectations when typing, but there's not really any guarantee that's true, and I haven't bothered to read their source code for their Undo extension.

```ts
const editor = new Editor({
	// ... other options ...
	extensions: [
		StarterKit, // or History if you don't want all of StarterKit
		createVerdantExtension(parentEntity, 'document', {
			batchConfig: {
				// Turn off Verdant undo tracking for this editor
				undoable: false,
			},
		}),
	],
});
```

## Usage with React

The library provides a single hook you can use to create a TipTap Editor that's backed with Verdant. It really just wraps the creation and configuration of the extension as shown above.

```tsx
import { useSyncedEditor } from '@verdant-web/tiptap/react';
import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function DocumentEditor({ post }: { post: Post }) {
	const editor = useSyncedEditor(post, 'body', {
		editorOptions: {
			extensions: [StarterKit],
		},
	});

	return (
		<EditorContent
			editor={editor}
			style={{ width: 500, height: 300, border: '1px solid black' }}
		/>
	);
}
```

The parameters of the hook are:

1. The parent object or document which has the TipTap field. You must pass the parent, not the field itself. This is to support cases where we must reassign the parent field entirely, like initializing a fresh document.
2. The name of the field which has the TipTap document. This will be typechecked against the first parameter.
3. Additional options, including:

   a. `nullDocumentDefault`: A default document snapshot value to use if the document field is `null`. You should provide this if your field is nullable and you haven't included any logic to prevent the rendering of the current component if the field is missing. It must be a full document snapshot and will be passed to the editor until the Verdant field is initialized on first change.

   b. `editorOptions`: Additional options to configure the editor, see `useEditor` from TipTap's React library

   c. `editorDependencies`: Values to include in the dependency array of `useEditor`. Be careful, these will cause the editor to be recreated when changing.
   d. `extensionOptions`: Any other options you want to use to configure the Verdant TipTap extension, see docs in previous section.

Other than that, everything is taken care of. Pass the `editor` returned to the `editor` prop of `EditorContent` from `@tiptap/react`, and you can now edit the document and watch as changes are persisted locally and synced to peers.

## Document node identities

First, I recommend you consider supporting TipTap by licensing their [official UniqueID extension](https://tiptap.dev/docs/editor/extensions/functionality/uniqueid) to assign and track IDs on nodes. But, that said...

The `@verdant-web/tiptap` extension already has to track node identities to apply proper diffing rules, and it does so by assigning the Verdant system's internal "object identifier" value to the `attrs` of each non-inline node. It is possible to reference this attribute, just import the key from `verdantIdAttribute`.

To actually support inline presence decorations, though, you will have to use a custom node view to apply the presence UI on each block. I leave that up to you and the [TipTap docs](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views).

## A note on "collaborative text"

As stated in the introduction, Verdant doesn't currently support realtime collaborative _text editing_, like you might expect from, say, Google Docs. This doesn't mean users can't collaborate on a document at all. What it means, specifically, is that two users editing the same exact paragraph (or any text node) will have a bad time, with each person's changes disrupting the other, and cursor position may jump around unexpectedly, etc.

I don't have any particular plans to support collaborative string editing. So keep that in mind. The existence of this integration doesn't imply any further development or support on that front.

That said, there are simple UX tricks you can use to avoid simultaneous edits of the same text node. I think locking a node while another user is editing it using [presence](../sync/presence.md) isn't terrible, personally. I like to imagine what would happen if you were actually collaborating with someone on a document in real life -- probably only one person would be actively writing at any point in time. I think it's more compelling to imagine digital analogues to that human experience than to enable very complicated simultaneous edit behavior which has no physical basis. But that's my own biases showing.
