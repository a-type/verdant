---
sidebar_position: 6
---

# Synchronizing files

When you create files locally, they are flagged as unsynced until you next go online.

When going online, any file data which was unsynced is sent to the the server. If it fails to upload, depending on the response code, a retry will be scheduled later.

If you're already online when a local file is created, it will be uploaded ASAP.

Meanwhile, in parallel, the normal Verdant data sync protocol will synchronize any associated field which references that file. This means that peers may receive data about a file field before the client that created it has finished uploading the file itself, and well before that client can proceed to download it.

For this reason, you should always handle the `.loading === true` case on any EntityFile you use, and probably `.failed === true` as well in case the server has problems.

## Storing files

You must provide a file storage backend to the server to sync files. This can be the default `LocalFileStorage` backend which is exported from `@verdant/server`, or you can implement the `FileStorage` interface yourself to connect to a different file storage service (like S3, etc).

If you don't supply a storage backend, syncing files will fail.

## Exposing a file upload endpoint

If you use the built-in Verdant server (via calling `server.listen()`) the file endpoint will be created for you.

If you integrate the Verdant server into a custom HTTP server, you must route an endpoint to for files to `server.handleFileRequest`. The endpoint must end in `/files/<file id>` and accept both POST and GET. For example, an Express middleware:

```ts
app.use('/Verdant/files/:fileId', lofiServer.handleFileRequest);
```

> TODO: make this friendlier.

## When the server cleans up files

The server has a broader view of the overall sync status of the library, so it hangs onto files a little longer than clients and waits to be sure the file is officially pending deletion.

"Officially pending deletion" means:

- The field associated with the file is deleted and all pending operations the server knows about have been applied to it
- Since the field has been rebased to this state, that means all clients have acknowledged the deletion as it currently stands

However, these conditions don't guarantee the file field will not be restored by a client - specifically if there is an 'undo delete' operation waiting on a client's undo stack.

To guard against this contingency, the server only marks the file's metadata as `pendingDeleteAt: <timestamp>`. The next time all replicas disconnect from the library, if the `pendingDeleteAt` timestamp is older than 1 day, the file will be permanently deleted. This is a heuristic more than a guarantee, but it's a reasonable tradeoff against having to synchronize undo stack states.
