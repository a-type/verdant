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

Since local-first apps are tied to a domain for their local storage, exporting can allow you to transfer data if your app moves to a new domain. It's not an ideal method, though, as the UX is pretty clunky. I don't recommend moving domains if you can help it.

That said, if your users are using sync, you don't need to do this - you can instead use the sync server to transfer data by moving users' sync endpoint over to the new server before completing the domain migration, or by copying your sync database to the new server directly (which is safer).

## Limitations of exporting data

At the time of writing, exported data can only be imported again if the client's schema matches the schema of the export exactly. That means you can't import data from old versions.

This is a significant limitation which basically removes this data export as a reliable "backup" option for users. It relegates it to temporary operations, like transferring between domains, or simple data "take-away" for users who want to, say, download all their files.

It's theoretically possible for me to support older versions, but I'm launching this as-is for now.
