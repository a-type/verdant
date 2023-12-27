---
sidebar_position: 8
---

# Pruning Invalid Data

Verdant has a lot of tricks up its sleeve for providing strong schema support while still making sure the data your app sees stays consistent, even when some peers haven't updated their app yet.

But this only goes so far. When I first designed the [migration](../local-storage/migrations.md) system, I felt it was solid enough to ship, but I always worried there were edge cases. Turns out there are, and it took me over a year of using Verdant in production to discover them!

The main problem is this: say you migrate your schema in a backwards-incompatible way, and a client connects and migrates. Now suppose another peer was online a little while ago, or is even online now using the old version, and they pushed some changes up to the server. This new, migrated client will still get those "old version" changes. Those changes could potentially include setting particular fields to values which are now invalid for the new schema.

Got it? You can skip the next bit and go on to how [pruning works](#pruning)

It's easier to see in an example...

Let's say your `comments` field used to be a list of strings:

```ts
comments: {
  type: 'array',
  items: { type: 'string' }
}
```

And your new version changes it to a list of objects with `body` properties:

```ts
comments: {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      body: { type: 'string' }
    }
  }
}
```

You would need to write a migration which converts existing data into the new shape, of course:

```ts
createMigration(v1Schema, v2Schema, async ({ migrate }) => {
	await migrate('posts', ({ comments, ...old }) => ({
		...old,
		comments: comments.map((body) => ({ body })),
	}));
});
```

So what's the problem? Well, the migration only runs when the client starts up. And, in fact, it runs _before_ the client syncs with the server, by design. Which means when migrating, we only see any comments we already know about.

But then let's say we sync with the server and someone has `push`ed a new comment to the comments list. We will get a sync message from the server like: "push `"hello world"` onto list `comments`." Only our `comments` isn't a list of strings anymore!

Other distributed systems solve this problem in very clever ways, like [Ink and Switch's inspiring Project Cambria](https://www.inkandswitch.com/cambria/) which uses "lenses" into data, rather than one-time migrations like Verdant. But these systems have costs, both in runtime and overall system complexity, which I don't feel confident trying to balance.

More systems instead force you to make only backwards-compatible schema changes, like only adding fields, and always making object relationships nullable. And that's fine, but I find that very limiting and tedious. I really like the idea of being able to rename or delete fields--otherwise naming becomes more obscure and awkward over time.

So here's my compromise: Verdant does something called **pruning**.

## Pruning

Verdant documents will scan their data whenever it changes and identify if any sub-field is invalid according to the schema. If invalid sub-fields are detected, Verdant figures out how to "prune" them while retaining the correct document shape.

If the field is nullable, it becomes `null`.

If the field has a default, it uses the default.

If the field is an `array` or `map` type, it becomes empty (don't worry, this only happens if the actual underlying datatype is incompatible - like if you changed a field type from `object` to `array`, something drastic like that).

Otherwise, the invalid-ness bubbles upward to the parent field, and the cycle continues.

If there's a chain of fields which can't be `null`ed or defaulted that contain invalid data all the way up to the root of the document, the document itself is pruned--it becomes inaccessible, similar to if it were deleted.

## What you need to know

The end result of pruning is that you can opt-in to a safer schema design by following the practices of other systems: add-only schemas, nullable fields, etc. Or, if you feel confident your schema design won't change much in some places, you can make them more strict as you like.

There are some things you want to be careful about when changing your schema:

- **Changing the shape of list or map items:** Items added by other clients may not appear on newer peers until those clients upgrade themselves.
- **Creating things if they aren't found:** If your app has logic which checks if a nullable field exists, and otherwise adds something there, it may accidentally overwrite pruned data. Working around this will depend on your situation.
