---
sidebar_position: 6
---

# Undo, Redo, and Batching

Local changes are undoable as long as you don't refresh the page. To undo a change, call `client.undoHistory.undo()`. To redo and undone change, call `client.undoHistory.redo()`.

You can also manually add events to the undo history. Call `client.undoHistory.addUndo(() => { /* your code */ })` to add an event to the undo stack. If your callback returns another callback, it will be added to the redo stack automatically. If you do this, your redo can also return a callback to undo, etc, ad infinitum. It's recommended if you want redoable changes.

Alternatively, you can use `client.undoHistory.addRedo` to manually push a redo operation. You could achieve undo/redo just by using these, like calling `addRedo` right after you call `undo` every time to queue the redo operation yourself.

## Undo behavior

As soon as you call `addUndo`, or whenever the user modifies data in an undoable way, the redo stack is dropped. This is meant to be consistent with normal OS undo/redo behavior - after undoing a few operations, if you do something new, you can no longer redo those original operations; you've entered a new timeline, as it were.

## Batching for more control

You can batch changes together to craft more intentional undo steps, or even turn off undo for particular changes.

Call `client.batch()` to receive a batch object. You can pass a configuration to modify batch behavior. The most important configuration parameter is `undoable: false`, which will make all changes in the batch non-undoable. **\*This doesn't mean that they are permanent**; it means that when the user performs an undo, it will skip over anything in the batch and undo the previous operations in history instead.

### Using the batch object

The returned batch object object has three methods.

The first is `.run(() => { ... })` which accepts a synchronous function, in which you apply any changes you like to entities. It returns the batch (chaining API) so you can call other methods.

The second is `.flush()` which pushes your changes onto the undo stack (unless you opted out) and also submits them to sync.

The third is `.discard()`, which can be used to drop any unflushed changes and remove the batch from memory.

For example, you might do something like this to avoid undo:

```ts
const item = await client.items.get('some-id').resolved;

client
	.batch({ undoable: false })
	.run(() => {
		item.set('content', 'hello world');
		item.set('category', 'none');
	})
	.flush();
```

### Batch default timeout

All batches (including the default ambient one) timeout after 200 milliseconds by default. This was meant to stay out of your way for longer-running batched operations but still ensure your changes get submitted. This behavior is a little naive and may change in the future.

### Configuring timeout or max item count

You can configure your own timeout value or maximum number of operations to buffer in your batch by passing `max` or `timeout` to the `client.batch({})` configuration. You can continue to reuse the same batch even if you hit these limits; your first operations will be flushed automatically, and new ones will be flushed after the `timeout` has expired or whenever enough changes are accumulated to reach `max`.

If you want to disable the timeout and maximum and rely only on manually invoking `.flush()`, you can pass `null` to both values. Be sure to call `.flush()` though - there are no other safeguards. Your changes will exist in memory immediately, but will not be stored or synced if you fail to call `.flush`.

Using the advanced configuration, you could batch together multiple operations so that they are all undone in one step, guaranteed:

```ts
const batch = client.batch({ timeout: null, max: null });
try {
	batch.run(() => {
		item.set('content', 'test');
	});
	const result = await fetch('/some-data');
	const body = await result.json();
	batch.run(() => {
		item.set('data', body.data);
	});
	await batch.flush();
} catch (err) {
	console.log('Failed to get metadata!');
	batch.discard();
}
```

Now if the user uses undo, both the `content` and `data` fields will be unwritten - even though there was a full request cycle between setting them.

You should note, however, that these changes will also delay syncing until the batch completes, which may be less responsive for multiplayer.

Also note the `try/catch` and use of discard here. In this case, we have written the logic so that if the request fails, the entire attempt to update the item is abandoned. If we had not caught an error, we might never call `.flush`, and the batch would remain in-memory and idle, which is not the end of the world, but is also pretty gross.
