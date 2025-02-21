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

## Usage with React

The library provides a single hook you can use to create a TipTap Editor that's backed with Verdant. It handles the nuances of how to apply changes between the Verdant field and the TipTap Editor for you.

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

Other than that, everything is taken care of. Pass the `editor` returned to the `editor` prop of `EditorContent` from `@tiptap/react`, and you can now edit the document and watch as changes are persisted locally and synced to peers.

## Applying Node IDs

Applying an ID to all document nodes can be pretty helpful, especially if you're tracking user presence per-block to show in the UI.

First, I recommend you consider supporting TipTap by licensing their [official UniqueID extension](https://tiptap.dev/docs/editor/extensions/functionality/uniqueid) to accomplish this. But, that said...

The `@verdant-web/tiptap` library also exports a `NodeIdExtension` which will apply a unique ID to the `attrs.id` of every non-text node.

```ts
import { NodeIdExtension } from '@verdant-web/tiptap';

useSyncedEditor(post, 'body', {
	editorOptions: { extensions: [NodeIdExtension()] },
});
```

It doesn't support much customization, but you can change which node types it applies to by passing an options argument. This is the minimal functionality to enable features like presence, so it felt important to include.

To actually support inline presence decorations, though, you will have to use a custom node view to apply the presence UI on each block. I leave that up to you and the [TipTap docs](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views).

## A note on "collaborative text"

As stated in the introduction, Verdant doesn't currently support realtime collaborative _text editing_, like you might expect from, say, Google Docs. This doesn't mean users can't collaborate on a document at all. What it means, specifically, is that two users editing the same exact paragraph (or any text node) will have a bad time, with each person's changes disrupting the other, and cursor position may jump around unexpectedly, etc.

I don't have any particular plans to support collaborative string editing. So keep that in mind. The existence of this integration doesn't imply any further development or support on that front.

That said, there are simple UX tricks you can use to avoid simultaneous edits of the same text node. I think locking a node while another user is editing it using [presence](../sync/presence.md) isn't terrible, personally. I like to imagine what would happen if you were actually collaborating with someone on a document in real life -- probably only one person would be actively writing at any point in time. I think it's more compelling to imagine digital analogues to that human experience than to enable very complicated simultaneous edit behavior which has no physical basis. But that's my own biases showing.
