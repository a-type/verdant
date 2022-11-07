---
sidebar_position: 7
---

# Authorization of shared data

Now that you're syncing data, you also have the possibility of granting shared access to that data, and even realtime collaboration.

As multiple users interact with data, you may have occasion to want to prevent certain users from doing certain things to certain objects. lo-fi allows this by configuring authorization options in the schema, and it enforces these constraints at both the client and server level. The goal of lo-fi authorization is to be as trustworthy and simple as traditional client/server authorization, but due to the 'closed' nature of how lo-fi data flows through sync, it is not as versatile as a system where you have full end-to-end control over the server code. I've tried to make it powerful enough for most cases.

You should not use authorization until you understand the contents of this page. Failure to do so could result in inconsistent outcomes or extreme performance impact.

## Triggers

Authorization in lo-fi is determined per-object, based on the type of change made: create, update, or delete. Read authorization is not supported at object-level (all users with access to the library may read any data in it).

An authorization function assigned to one of these actions on a field will receive some context data and must return a boolean value to decide whether the user has permission to make the change.

The function receives:

- `userId`: the ID of the user associated with the change
- `replicaId`: the ID of the replica the user is making the change from
- `value`: in cases of create or update, this will contain the value being assigned to the field.
- `previousValue`: in cases of update or delete, this will be the previous value assigned to the field.
- `root`: a reference to the root document. Traversals of the document can be made to do more advanced conditional authorization logic.

## When authorization happens

Coming from traditional systems, one tends to think of authorization as happening once, on the server, when the user submits a change. Perhaps on more robust apps it happens first on the client for quicker feedback, then on the server to guarantee safety.

However, in lo-fi, authorization happens _every time a change is re-reconciled with the overall data_. That includes when it is initially applied on the client, when it's applied on the server, when it's applied on remote clients, and then every other time that change is re-applied as part of conflict resolution! It could happen at any time. Notably, operations are re-applied if the history of an object must be re-computed because a new operation is inserted.

For this reason, authorization should be written for _speed_. Only synchronous functions are allowed, and only pure functions are valid. You should use the data provided above alone for your authorization, and make every effort to reduce computation.

## What happens to unauthorized changes?

Changes can be re-applied to entirely different states depending on how conflict resolution merges in peer operations. So, instead of discarding a change as soon as it fails authorization criteria, lo-fi keeps it around but ignores it. If the operation is re-applied later, it will have another chance to be included if it passes authorization this time.
