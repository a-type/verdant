# Verdant Cloudflare Bindings

This library provides bindings for running a Verdant sync backend on Cloudflare using Workers, Durable Objects and (optionally) R2 Object Storage.

```ts
import { createVerdantWorkerApp, R2FileStorage, DurableObjectLibrary } from '@verdant-web/cloudflare';
import { errorHandler } from '@verdant-web/server/hono';
import { Hono } from 'hono';

export class VerdantLibrary extends DurableObject {
	private verdant: DurableObjectLibrary;

	constructor(ctx: DurableObjectState, env: any) {
		super(ctx, env);
		this.verdant = new VerdantObject(ctx, {
			tokenSecret: env.TOKEN_SECRET,
			// verdant also has an s3 storage you can use
			fileStorage: new R2FileStorage({
				host: `https://my-deployed.app/files`,
				bucket: env.VERDANT_BUCKET,
			}),
			profiles: {
				get: async (id) => {
					return env.YOUR_D1_DB.prepare(`SELECT * FROM User WHERE id = ?`).bind(id).first();
				},
			},
			log: (level, ...args) => {
				// log if you like.
			}
		});
	}

	// these methods are REQUIRED!
	fetch(request: Request) {
		return this.verdant.fetch(request);
	}
	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		return this.verdant.webSocketMessage(ws, message);
	}
	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		return this.verdant.webSocketClose(ws, code, reason, wasClean);
	}
	webSocketError(ws: WebSocket, error: Error) {
		return this.verdant.webSocketError(ws, error);
	}

	// you're free to define more, including exposing
	// library APIs
	getDocumentSnapshot(collection: string, id: string) {
		return this.verdant.getDocumentSnapshot(collection, id);
	}
}

const verdantRouter = createVerdantWorkerApp({
	durableObjectBindingName: 'VERDANT_LIBRARY',
	tokenSecretBindingName: 'TOKEN_SECRET',
});

export default new Hono<{ Bindings: Env }>()
	// you can bind the Verdant API to any subpath you like
	.route('/verdant', verdantRouter)
	// it's recommended, but not required, to define the rest of
	// your own server API here to set up auth and serve user files.
	.get('/auth/:library', async (ctx) => {
		const library = ctx.req.param('library');
		// TODO: you write logic to authenticate and retrieve your user session
		// and make sure they are allowed to sync this library
		const session = ...;
		const tokenProvider = new TokenProvider({ secret: ctx.env.TOKEN_SECRET });
		const token = tokenProvider.getToken({
			libraryId: library,
			userId: session.userId,
			// point to your verdant API router subpath
			syncEndpoint: `https://my-deployed.app/verdant`,
		});
		// this payload shape is important.
		return ctx.json({ accessToken: token });
	})
	// NOTE: serving files via your worker is optional, even for R2 storage.
	// You could also set up a custom domain for your bucket with
	// public access, and configure R2FileStorage with that domain instead.
	.get('/files/*', async (ctx) => {
		const path = ctx.req.path.replace(/^/files\//, '');
		// retrieving the actual file from our R2 bucket
		const obj = await ctx.env.VERDANT_BUCKET.get(path);
		if (!obj?.body) {
			return ctx.text('not found', 404);
		}
		return new Response(obj.body, {
			headers: {
				'Content-Type':
					obj.httpMetadata?.contentType ?? 'application/octet-stream'
			}
		})
	})
```

## Using the Durable Object binding

This library exports a Library API representation you compose into your own defined Durable Object, at least for now. This avoids some weird behavior with DurableObject subclassing and generally favors composition over inheritance. You are free to customize the actual invocation of this underlying library API withing your DO, but you should make sure the right methods end up getting called or it won't work.

You can access a library's Durable Object directly by calling `getByName(libraryId)`. Internally, `createVerdantWorkerApp` does this the same way.

One quirk of how the DO lifecycle works is that the library won't be initialized until the first Verdant client connects and seeds the Library's ID. If you try to access and call RPC methods on your DO without first handling a `fetch` request, things may or may not work as expected.

If you want to use or manipulate a library before any clients connect (I can't think of a reason for this, but anyway), call `.initialize(libraryId)` first with its library ID. It might seem intuitive that the DO you got access to by passing the library ID to `getByName` would know its own ID already, but it won't if it's never been used, because the "name" of a DO is not exposed to it.
