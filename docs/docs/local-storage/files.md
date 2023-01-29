---
sidebar_position: 7
---

# File storage

To work with files in lo-fi, you add a `file` type field to a document. From there it acts similar to other fields, with a few notable peculiarities.

You can call `.set('fileField', file)` on your document with any `File` object - for example, one you get from a change event on an `<input type="file">`.

When you call `.get('fileField')`, you'll receive an immutable EntityFile object which represents your stored file. Access the `.url` field to make the file available in your app (for example, as an `<img>` tag's `src`).

### Asynchronous loading

Loading every file on every document you query would quickly become a memory hog, so instead lo-fi waits until you access one to begin loading. The `EntityFile` you get from your document instance will have a `.loading` property which is true while the file is being loaded. You can subscribe to `change` events to listen for loading completion.

Until a file is loaded the `.url` field will be `null`.

If the file fails to load for some reason, `.failed` will become `true`.

You should handle these cases! In a synchronized world, especially, they could come up - even if only temporarily, while the client synchronizes or the server recovers from downtime.

### Where are files stored?

For locally created files, lo-fi stores the raw file data directly in IndexedDB. This means locally created files work offline and don't require a server to use.

### How are files cleaned up?

lo-fi decides when to delete local file data based on the following criteria:

- The associated document field has been either replaced or deleted
- the document has rebased (squashed) all pending changes to that field

To lo-fi, this means "that field is gone and there's no way for this client to get it back." It considers any such file fields safe for local deletion.

You might think about the undo feature! But when a file is 'deleted' in this sense, it's only marked for deletion.

It _is_ possible, but unlikely, if you're using sync, for such a file field to be restored (for example, a peer may have committed a change which undoes a deletion timestamped after local changes). But in such a scenario, lo-fi will automatically re-fetch the file metadata from the server. For more information about files in a server-synchronized world, see [Synchronizing files](../sync/files).

## Managing files that aren't associated with a particular document

Perhaps you want to just have a collection of _files_, not necessarily attached to one field on one particular document. You still have to manage these files in a schema, but you can create a new collection just for those files.

```ts
const storedFiles = collection({
	name: 'storedFile',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
		},
		file: {
			type: 'file',
		},
	},
});
```

You could reference a file stored in this way by its ID from any number of documents, or in other state.
