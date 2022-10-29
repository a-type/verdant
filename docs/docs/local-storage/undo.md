---
sidebar_position: 6
---

# Undo & Redo

Local changes are undoable as long as you don't refresh the page. To undo a change, call `client.undoHistory.undo()`. To redo and undone change, call `client.undoHistory.redo()`.

You can also manually add events to the undo history. Call `client.undoHistory.addUndo(() => { /* your code */ })` to add an event to the undo stack. If your callback returns another callback, it will be added to the redo stack automatically. If you do this, your redo can also return a callback to undo, etc, ad infinitum. It's recommended if you want redoable changes.

Alternatively, you can use `client.undoHistory.addRedo` to manually push a redo operation. You could achieve undo/redo just by using these, like calling `addRedo` right after you call `undo` every time to queue the redo operation yourself.

## Undo behavior

As soon as you call `addUndo`, or whenever the user modifies data in an undoable way, the redo stack is dropped. This is meant to be consistent with normal OS undo/redo behavior - after undoing a few operations, if you do something new, you can no longer redo those original operations; you've entered a new timeline, as it were.
