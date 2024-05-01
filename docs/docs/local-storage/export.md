---
sidebar_position: 8
---

# Exporting and importing data

Verdant clients can export all local data, and even download remote files if needed to include in the export.

```ts
const exportedData = await client.export({ downloadRemoteFiles: true });
```

This exported data includes all document data, even change history. It also includes metadata about files, and the files themselves (as a list of `File`s).

This means a client importing this dataset should behave identically to the client which exported it. The only caveat is that importing doesn't take on the original client's _sync identity_.

## Uses of exporting data

Since local-first apps are tied to a domain for their local storage, exporting can allow you to transfer data if your app moves to a new domain. I don't recommend moving domains if you can help it. See how to do this relatively seamlessly below.

## Using exports to transfer data between origins

> First off, **if your users are using sync, you don't need to do this** - you can instead use the sync server to transfer data by moving users' sync endpoint over to the new server before completing the domain migration. A replica will populate the new sync server automatically and then you're ready to transition.

> Also this **only works in PWAs on non-iPhones**. Apple restricts the storage context of PWAs on iPhones, so although the transfer itself will work, the new origin won't have access to the data when launched in Safari or installed as a new PWA. Aren't iPhones fun?

Verdant has built-in tools to easily transfer a library from one origin (website) to another built on top of the `export` functionality documented above. This is an experimental tool which uses an embedded `iframe` to transmit the data file directly through the browser - no server required!

First off, it's important that both sites are running the exact same codebase. To make the transition, point DNS records for both origins to the same hosted webpage. Any discrepancy in schemas will cause unworkable errors.

**Then, add the following code snippet anywhere in your app:**

```ts
// assuming you have a ClientDescriptor instance handy here. You probably
// already have a client ready somewhere!
const client = await clientDescriptor.open();

const backup = await('@verdant-web/store/backup');
backup.transferOrigins(
	client,
	'https://OLD-origin.com',
	'https://NEW-origin.com',
);
```

That's the bulk of it! Since this code runs on both the new and old origins, the helper will synchronize the back-and-forth transfer negotiation for you from both sides.

The last thing you need to do to make this work is add a `?transfer=true` query param to your NEW origin. This will initiate the transfer helper.

The most straightforward pattern here is to show a modal or something to the user explaining the domain move, and then give them a link to the new origin with `?transfer=true` set. But if you don't want to explain anything, I guess you could just set up a redirect.

And, again, this doesn't work on iPhone PWAs. If your old app was an iPhone PWA... you have to instruct your user to export their data and import it after installing the new app 😞.

### How the transfer works

1. New app detects it's on the new origin and the `?transfer=true` param is set.
2. New app creates an `iframe` for the old origin.
3. The `iframe` detects it's on the old origin and sends out a message to any parent window on the new origin that it's ready to transfer.
4. New app detects the message and responds with a go-ahead.
5. The `iframe` does a client export and sends the data as an attachment in a post message.
6. The new app receives the export file, unbundles it, and loads it up. Then it deletes the query param.
7. Just in case (to avoid accidental resets), a local storage flag is also set to avoid another transfer in the future.

## Limitations of exporting data

At the time of writing, exported data can only be imported again if the client's schema matches the schema of the export exactly. That means you can't import data from old versions.

This is a significant limitation which basically removes this data export as a reliable "backup" option for users. It relegates it to temporary operations, like transferring between domains, or simple data "take-away" for users who want to, say, download all their files.

It's theoretically possible for me to support older versions, but I'm launching this as-is for now.
