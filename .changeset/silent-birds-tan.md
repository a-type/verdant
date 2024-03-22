---
'@verdant-web/server': major
'@verdant-web/common': minor
'@verdant-web/store': minor
---

**Migration of server code required**

Introduces support for custom server storage solutions via interface implementation. This change also makes server storage queries and writes async (they weren't before), which improves compatibility with custom solutions and performance overall with high message concurrency.

## Server migration

Previously, you'd create a new Verdant server like so:

```ts
new VerdantServer({
	databaseFile: './path/to/db.sqlite',
});
```

Now, you should import `sqlStorage` from `@verdant-web/server/storage` and provide it to the `storage` parameter:

```ts
new VerdantServer({
	storage: sqlStorage({
		databaseFile: './path/to/db.sqlite',
	}),
});
```

That's all that's needed. Remember to also upgrade your client to handle some small tweaks to sync protocols. They should be non-breaking, but it's better to be safe here.
