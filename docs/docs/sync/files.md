---
sidebar_position: 7
---

# Synchronizing files

When you create files locally, they are flagged as unsynced until you next go online.

When going online, any file data which was unsynced is sent to the the server. If it fails to upload, depending on the response code, a retry will be scheduled later.

If you're already online when a local file is created, it will be uploaded ASAP.

Meanwhile, in parallel, the normal Verdant data sync protocol will synchronize any associated field which references that file. This means that peers may receive data about a file field before the client that created it has finished uploading the file itself, and well before that client can proceed to download it.

For this reason, you should always handle the `.loading === true` case on any EntityFile you use, and probably `.failed === true` as well in case the server has problems.

## Storing files

You must provide a file storage backend to the server to sync files. This can be the default `LocalFileStorage` backend which is exported from `@verdant-web/server`, or you can implement the `FileStorage` interface yourself to connect to a different file storage service (like S3, etc).

If you don't supply a storage backend, syncing files will fail.

## Serving files

This may be a little confusing, honestly, but _serving_ files is up to you.

Verdant handles _uploading_ files (via a `FileStorage` implementation) and _getting file metadata_. But the actual request to fetch the real file is something your infrastructure must implement.

This is left up to the user because there are many valid ways to deliver actual files, and the best one might depend on your app's needs. Perhaps you can serve them from a mounted disk volume, or via a public Cloudfront CDN, etc.

How this happens all depends on how your `FileStorage` implementation works. Since `FileStorage`s aren't very large classes, I recommend reading the one you're using.

- [LocalFileStorage](https://github.com/a-type/verdant/blob/main/packages/server/src/files/FileStorage.ts#L30)
- [S3FileStorage](https://github.com/a-type/verdant/blob/main/packages/file-storage-s3/src/index.ts)
- [R2FileStorage](https://github.com/a-type/verdant/blob/main/packages/cloudflare/src/files.ts)

Generally, when Verdant requests files, the request will be in the following format:

```
<base file host>/:libraryId/:fileId/:fileName
```

And FileStorage implementations usually expose the host as a parameter you provide. So if you have a Cloudfront set up at `https://user-files.myapp.com`, your file request might look like `https://user-files.myapp.com/library/file/filename.png`. If you're using the S3FileStorage implementation to put files in a bucket behind that Cloudfront instance, you're probably fine.

However, if you need to terminate file requests in your own server, you may have more work to do. Say instead you have a Cloudflare Worker API that streams the files from an R2 bucket. Your worker API might look like:

```ts
app.get('/files/*', async (ctx) => {
	const path = ctx.req.path.replace(/^\/files\//, '');
	const obj = await ctx.env.FILES_BUCKET.get(path);
	if (!obj?.body) {
		return ctx.text('not found', 404);
	}
	return new Response(obj.body, {
		headers: {
			'Content-Type':
				obj.httpMetadata?.contentType || 'application/octet-stream',
		},
	});
});
```

It's probably better to use wildcards like this rather than depend directly on the `:libraryId/:fileId/:filepath` convention, as I may want to change that at some point, so this keeps things decoupled.

## When the server cleans up files

The server has a broader view of the overall sync status of the library, so it hangs onto files a little longer than clients and waits to be sure the file is officially pending deletion.

"Officially pending deletion" means:

- The field associated with the file is deleted and all pending operations the server knows about have been applied to it
- Since the field has been rebased to this state, that means all clients have acknowledged the deletion as it currently stands

However, these conditions don't guarantee the file field will not be restored by a client - specifically if there is an 'undo delete' operation waiting on a client's undo stack.

To guard against this contingency, the server only marks the file's metadata as `pendingDeleteAt: <timestamp>`. The next time all replicas disconnect from the library, if the `pendingDeleteAt` timestamp is older than 1 day, the file will be permanently deleted. This is a heuristic more than a guarantee, but it's a reasonable tradeoff against having to synchronize undo stack states.
