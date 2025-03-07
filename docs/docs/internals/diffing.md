---
sidebar_position: 4
---

# Auto-diffing

Verdant comes with some moderately sophisticated auto-diffing of nested JSON content. While most of the time you should make specific and intentional changes to data using entity methods like `.set`, `.push`, etc, diffing comes into play in two scenarios:

- Migrations: when using the `migrate('collection', ...)` tool, the migration function receives a snapshot of the document and returns a migrated plain object. The migration engine then uses Verdant's diffing algorithm to determine what changes to apply for the migration.
- `.update`: Object entities have a `.update` field which accepts a deep object representation to apply to the entire entity. `.update` allows full replacement of the object, or a deep merge where new fields overwrite old ones but any untouched fields are retained. Both versions use Verdant's diffing algorithm.

> Note: for the migrations use case, I'm considering a future update which deprecates diff-based migrations and exposes the same entity tools as the runtime code to enable more intentional migration changes.

## How diffing works

The diffing algorithm is fairly complex and tries to produce a minimal changeset, within reason. This means it may make some assumptions which don't match user intention. So, I thought I'd clarify what happens here. All of this behavior is covered in unit tests, too.

### Object identity preservation

Diffing will always make an effort to preserve the identities of sub-objects. Verdant assigns unique identifiers to all sub-objects, so if these identifiers are available for incoming data, it will match up identities and only apply internal changes to these objects instead of replacing them. For example, if you started from `{ foo: { bar: 1 } }` and ended with `{ foo: { bar: 2 } }`:

- If the sub-object has retained its Verdant identifier reference, the produced diff will only apply the `bar: 1 -> 2` change.
- If the sub-object has not retained its Verdant identifier, the produced change will assign the root `foo` key to a brand new object, `{ bar: 2 }`.

Obviously the second case is not very efficient, especially if you have large and deeply nested structures. So in addition to attempting to preserve object identity references (which is often brittle and cannot be maintained with user-supplied objects), Verdant also exposes an option to `.update` called `replaceSubObjects`. When this is off (default), Verdant will assume any incoming object which has no assigned identity is the same as whatever was already there. By turning this option off, you can instead intentionally produce the second outcome above.

### Prevention of moving objects or multiple references to the same object

Suppose you did something like this,

```ts
const foo = doc.get('foo');
doc.update({
	bar: foo.getSnapshot(),
});
```

Naively, this appears to take the `foo` field and assign it to the `bar` key. Since merge is on by default, this would mean this same object is assigned to two keys in `doc`.

Verdant's diffing algorithm does not allow this. Mainly because it would be a footgun in most cases, producing documents with fields that unexpectedly update when 'other' fields change. Verdant assumes that even if you do something like the above, your intention is to create a copy of the same data in the other field. So, it creates the clone for you automatically, initializing it and assigning it a new identity.

Right now there is no way to alter that behavior. So, this prevents not only multiple assignments, but also the movement of a sub-object from one key to another while preserving its identity (note: this is possible with list entities, though, using special methods like `.move`).

If there's a use case for moving objects with preserved identities within objects or maps, let me know with an issue, I can probably make this work.

### List heuristics

Lists are pretty complicated to diff well, and on top of that, the result of a bad diff can be particularly gross. For example, if you had a list diff like

```
[0, 1, 3, 4, 5, 6, 7] -> [0, 1, 2, 3, 4, 5, 6, 7]
```

A human can easily grasp that the intention was to just insert `2`. But a naive list diff will instead _set_ 2 to the third position, then proceed to erase and overwrite every subsequent value, losing all identities in the process.

The irony here is, diffing is most useful for quick integration with complex document objects like rich text schemas, in which this kind of insertion (say, inserting a paragraph in the middle of a large document) is incredibly common, and where the preservation of item identities is crucial to sane collaboration!

So the diffing algorithm must be a little more smart than that.

As of writing this, though, it's still a work in progress. Here are some supported behaviors:

1. Diffs can detect a single insertion of an item, as long as the items on either side retain their identities. It cannot (yet) detect insertions of ranges of items.
2. Diffs will encode items added past the end of the original list as pushes, not sets.

These conventions at least allow you to use diffing to insert one new item in the middle of a list, as long as Verdant object identities are preserved. However, this relies on identity preservation, which is a challenge. Verdant's [TipTap](../integrations/tiptap.md) integration, for example, writes object identifiers to the attributes of all document nodes under the hood, just so it can read them again when changed data is delivered from the editor and reconstruct the identity tree of the document before diffing. But even this is tenuous, and will probably be replaced with non-diff-based change tracking as that integration matures.
