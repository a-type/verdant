---
sidebar_position: 10
---

# Access Control

Verdant has limited access for document access control in sync'd environments. This is still an early days, kicking-the-tires approach. As such I've limited the power of it to two modes: "shared" (default) and "private" (only devices you own can see the document).

Access control happens at the root document level only. Sub-fields cannot be independently authorized.

> While not currently available, the goal of incubating this feature is to allow granting document access to specific users by ID, or groups of users by shared group assignment / roles. I'm testing real-world behavior before expanding use cases though.

To create a document with access control, pass an `access` parameter to the second object of `.put`:

```ts
client.recipes.put({ title: 'Penne alla Vodka' }, { access: 'private' });
```

Currently only `private` and `shared` are supported. `shared` does nothing, really; all documents default to shared already and no access info is assigned when using it.

`private` documents are authorized for access by all replicas connecting to sync which are assigned a token for the User ID of the replica which created the document. The server will refuse to replicate any data related to the document to any unauthorized replicas, so other users shouldn't even be aware that the document exists.

## Changing access

Because access control is embedded into document operations, and Verdant history is immutable, document access is also immutable. Right now the only way to 'change' access is to create a copy of the document. You can do this like so:

```ts
const publicRecipe = await client.recipes.clone(privateRecipe, {
	access: 'shared',
});
```

This creates a new document. If you want to 'move' a document from public to private or vice versa, you should delete the old one.

This is not the most convenient thing in the world, sure, but anything else would create unexpected behavior. For example, changing a document's access partway through its history, even with a full re-initialization, would create inconsistent document history across replicas. If you doubt the importance of this, consider what would happen if you took a public document and made it private from the perspective of a replica which was not part of the private access group. The replica would have no indication the document was altered and continue using it as before -- and those public changes would also get mashed together with changes on the now-private document. Maybe I haven't explained this well, but just trust me: convenient or no, it's best to keep access immutable and make a new document.

## A warning about custom `primaryKey` ⚠️⚠️⚠️

Using a specific 'well known' value for a document's primary key can have benefits, using a primary key value which can collide with another document's primary key is NOT SUPPORTED for documents with access control. Two separate documents, authorized to different users, which have the same primary key, will essentially share a history, which will produce confusing results (similar to the problems with mutable access above).

Using a non-random primary key is only really useful to ensure 'canonical' status of a document in synchronized scenarios. Given that authorized documents aren't synced to all replicas, this canonicity doesn't make as much sense. If you need to be able to look up an access-controlled document by a 'well known' identifier, please use a custom index and `findOne` instead. This won't guarantee uniqueness of that identifier, but it will at least work in a sane way.

If this doesn't meet your requirements, we can talk and maybe there's a better solution.
