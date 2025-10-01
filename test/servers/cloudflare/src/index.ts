import {
	createVerdantWorkerApp,
	R2FileStorage,
	DurableObjectLibrary as VerdantObject,
} from '@verdant-web/cloudflare';
import { LibraryApi, ReplicaType, TokenProvider } from '@verdant-web/server';
import { errorHandler } from '@verdant-web/server/hono';
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

export class VerdantLibrary extends DurableObject<Env> implements LibraryApi {
	private verdant: VerdantObject;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.verdant = new VerdantObject(ctx, {
			tokenSecret: env.TOKEN_SECRET,
			fileStorage: new R2FileStorage({
				host: `http://localhost:${env.PORT || 8787}/files`,
				bucket: env.VERDANT_BUCKET,
			}),
			profiles: {
				get: async (id) => {
					return { id };
				},
			},
			log: (...args) => {
				// console.log(`☁️`, ...args);
			},
		});
	}

	fetch(request: Request): Response | Promise<Response> {
		return this.verdant.fetch(request);
	}
	webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	): void | Promise<void> {
		return this.verdant.webSocketClose(ws, code, reason, wasClean);
	}
	webSocketError(ws: WebSocket, error: Error): void | Promise<void> {
		return this.verdant.webSocketError(ws, error);
	}
	webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> {
		return this.verdant.webSocketMessage(ws, message);
	}

	getDocumentSnapshot(collection: string, id: string) {
		return this.verdant.getDocumentSnapshot(collection, id);
	}
	getFileInfo(fileId: string) {
		return this.verdant.getFileInfo(fileId);
	}
	async evict() {
		await this.verdant.evict();
	}
	forceTruant(replicaId: string) {
		return this.verdant.forceTruant(replicaId);
	}
	getInfo() {
		return this.verdant.getInfo();
	}
}

const verdantRouter = createVerdantWorkerApp({
	durableObjectBindingName: 'VERDANT_LIBRARY',
	tokenSecretBindingName: 'TOKEN_SECRET',
});

export default new Hono<{ Bindings: Env }>()
	.onError(errorHandler)
	.use(
		cors({
			origin(origin, c) {
				return origin;
			},
			allowHeaders: ['Authorization', 'Content-Type', 'X-Client'],
			allowMethods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
			maxAge: 86400,
			credentials: true,
		}),
	)
	.route('/lofi', verdantRouter)
	.get('/auth/:library', async (ctx) => {
		const library = ctx.req.param('library');
		const user = ctx.req.query('user') || 'anonymous';
		const type =
			(ctx.req.query('type') as unknown as ReplicaType) || ReplicaType.Realtime;

		const host = new URL(ctx.req.url).origin;
		const tokenProvider = new TokenProvider({ secret: ctx.env.TOKEN_SECRET });
		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			syncEndpoint: `${host}/lofi`,
			type,
		});
		return ctx.json({
			accessToken: token,
		});
	})
	.get('/files/*', async (ctx) => {
		const path = ctx.req.path.replace(/^\/files\//, '');
		const obj = await ctx.env.VERDANT_BUCKET.get(path);
		if (!obj) {
			return ctx.text('Not found', 404);
		}
		const body = obj.body;
		if (!body) {
			return ctx.text('Not found', 404);
		}
		return new Response(body, {
			headers: {
				'Content-Type':
					obj.httpMetadata?.contentType || 'application/octet-stream',
			},
		});
	})
	.get('/libraries/:libraryId/documents/:collection/:id', async (ctx) => {
		const { libraryId, collection, id } = ctx.req.param();
		const library = await ctx.env.VERDANT_LIBRARY.getByName(libraryId);
		if (!library) {
			return ctx.json({ error: 'Library not found' }, 404);
		}
		const doc = await library.getDocumentSnapshot(collection, id);
		if (!doc) {
			return ctx.json({ error: 'Document not found' }, 404);
		}
		return ctx.json(doc);
	})
	.get('/libraries/:libraryId/files/:file', async (ctx) => {
		const { libraryId, file } = ctx.req.param();
		const library = await ctx.env.VERDANT_LIBRARY.getByName(libraryId);
		if (!library) {
			return ctx.json({ error: 'Library not found' }, 404);
		}
		const info = await library.getFileInfo(file);
		if (!info) {
			return ctx.json({ error: 'File not found' }, 404);
		}
		return ctx.json({
			id: info.id,
			fileName: info.name,
			libraryId,
			type: info.type,
			url: info.url,
		});
	})
	.post('/libraries/:libraryId/evict', async (ctx) => {
		const { libraryId } = ctx.req.param();
		await (await ctx.env.VERDANT_LIBRARY.getByName(libraryId)).evict();
		return ctx.json({ success: true });
	})
	.get('/libraries/:libraryId', async (ctx) => {
		const { libraryId } = ctx.req.param();
		const library = await ctx.env.VERDANT_LIBRARY.getByName(libraryId);
		if (!library) {
			return ctx.json({ error: 'Library not found' }, 404);
		}
		const info = await library.getInfo();
		if (!info) {
			return ctx.json({ error: 'Library info not found' }, 404);
		}
		return ctx.json(info);
	})
	.post(
		'/libraries/:libraryId/replicas/:replicaId/force-truant',
		async (ctx) => {
			const { libraryId, replicaId } = ctx.req.param();
			const library = await ctx.env.VERDANT_LIBRARY.getByName(libraryId);
			if (!library) {
				return ctx.json({ error: 'Library not found' }, 404);
			}
			await library.forceTruant(replicaId);
			return ctx.json({ success: true });
		},
	);
