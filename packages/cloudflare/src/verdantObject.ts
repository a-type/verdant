import {
	ClientMessage,
	EventSubscriber,
	VerdantError,
} from '@verdant-web/common';
import { TokenInfo } from '@verdant-web/server';
import {
	ClientConnectionManager,
	DatabaseTypes,
	errorHandler,
	FileStorageLibraryDelegate,
	Library,
	migrateToLatest,
	migrations,
	SqlShardStorage,
	tokenMiddleware,
	TokenVerifier,
	UserProfileLoader,
} from '@verdant-web/server/internals';
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Kysely } from 'kysely';
import { globalContext } from './globals.js';
import { DODialect } from './kyselyDialect.js';

interface SocketMeta {
	tokenInfo: TokenInfo;
	key: string;
}

export class VerdantObject extends DurableObject {
	#app: Hono<any>;
	#socketInfoCache: WeakMap<WebSocket, SocketMeta> = new WeakMap();
	#clientConnections!: ClientConnectionManager;
	#library!: Library;
	#initialized = false;

	constructor(ctx: DurableObjectState, env: any) {
		super(ctx, env);

		this.ctx.getWebSockets().forEach((ws) => {
			// restore socket info after hibernation
			const info = ws.deserializeAttachment() as SocketMeta | undefined;
			if (info) {
				this.#socketInfoCache.set(ws, info);
			}
		});

		this.#app = new Hono()
			.onError(errorHandler)
			.use(
				tokenMiddleware(
					new TokenVerifier({ secret: globalContext.tokenSecret }),
				),
			)
			// TODO: do we need to check that the library ID matches
			// the storage state here?
			.use(async (ctx, next) => {
				// only after authorization, migrate the database
				await this.init(ctx.get('tokenInfo').libraryId);
				return next();
			})
			.post('/sync', async (ctx) => {
				const info = ctx.get('tokenInfo');
				const body = (await ctx.req.json()) as
					| { messages: ClientMessage[] }
					| null
					| undefined;
				if (!body) {
					throw new VerdantError(
						VerdantError.Code.BodyRequired,
						undefined,
						'Invalid request body',
					);
				}
				const finish = this.#clientConnections.addFetch(
					ctx.get('key'),
					ctx.req.raw,
					info,
				);
				for (const message of body.messages) {
					await this.#library.handleMessage(message, ctx.get('key'), info);
				}
				const res = finish();
				return res;
			})
			.post('/sync/files/:fileId', async (ctx) => {
				const info = ctx.get('tokenInfo');

				const id = ctx.req.param('fileId');
				if (!id) {
					throw new VerdantError(
						VerdantError.Code.NotFound,
						undefined,
						'Supply a file ID as a path parameters',
					);
				}

				const form = await ctx.req.parseBody();
				const file = form.file;
				if (!file || !(file instanceof File)) {
					throw new VerdantError(
						VerdantError.Code.InvalidRequest,
						undefined,
						'File must be provided as form data',
					);
				}

				await globalContext.fileStorage.put(file.stream(), {
					id,
					libraryId: info.libraryId,
					fileName: file.name,
					type: file.type,
				});

				return ctx.json({ success: true });
			})
			.get('/sync/files/:fileId', async (ctx) => {
				const id = ctx.req.param('fileId');
				if (!id) {
					throw new VerdantError(
						VerdantError.Code.NotFound,
						undefined,
						'Supply a file ID as a path parameters',
					);
				}

				const fileInfo = await this.#library.getFileInfo(id);
				if (!fileInfo) {
					throw new VerdantError(
						VerdantError.Code.NotFound,
						undefined,
						'File not found',
					);
				}

				return ctx.json(fileInfo);
			})
			// add socket handler
			.all('/socket', async (ctx) => {
				// WebSocket endpoint
				const upgradeHeader = ctx.req.header('Upgrade');
				if (upgradeHeader !== 'websocket') {
					return ctx.json({ error: 'Upgrade to WebSocket required' }, 400);
				}

				const info = ctx.get('tokenInfo');

				const websocketPair = new WebSocketPair();
				const [client, server] = Object.values(websocketPair);

				this.ctx.acceptWebSocket(server);

				const meta: SocketMeta = {
					tokenInfo: info,
					key: ctx.get('key'),
				};
				server.serializeAttachment(meta);
				this.#socketInfoCache.set(client, meta);

				return new Response(null, {
					status: 101,
					webSocket: client,
				});
			});
	}

	init = async (libraryId: string) => {
		if (this.#initialized) {
			return;
		}
		this.#initialized = true;
		const db = new Kysely<DatabaseTypes>({
			dialect: new DODialect({
				storage: this.ctx.storage,
			}),
		});
		migrateToLatest(db, migrations);
		const storage = new SqlShardStorage(db, {
			libraryId,
			fileDeleteExpirationDays:
				globalContext.storageOptions?.fileDeleteExpirationDays ?? 14,
			replicaTruancyMinutes:
				globalContext.storageOptions?.replicaTruancyTimeout ?? 14 * 24 * 60,
		});
		this.#clientConnections = new ClientConnectionManager({
			profiles: new UserProfileLoader(globalContext.profiles),
		});
		this.#library = new Library({
			id: libraryId,
			storage,
			sender: this.#clientConnections,
			events: new EventSubscriber(),
			disableRebasing: globalContext.disableRebasing,
			fileStorage: new FileStorageLibraryDelegate(
				libraryId,
				globalContext.fileStorage,
			),
			log: globalContext.log,
			presence: this.#clientConnections.presence,
		});
		await this.ctx.storage.put('libraryId', libraryId);
	};

	async fetch(request: Request) {
		return this.#app.fetch(request);
	}

	#getSocketInfo = (ws: WebSocket) => {
		if (!this.#socketInfoCache.has(ws)) {
			// check for serialized form
			const info = ws.deserializeAttachment() as SocketMeta | undefined;
			if (info) {
				this.#socketInfoCache.set(ws, info);
				return info;
			}
			throw new Error('No user token info associated with socket');
		}
		return this.#socketInfoCache.get(ws)!;
	};

	webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> {
		const { tokenInfo, key } = this.#getSocketInfo(ws);
		const msg = JSON.parse(message.toString()) as ClientMessage | null;
		if (!msg) {
			throw new VerdantError(
				VerdantError.Code.InvalidRequest,
				undefined,
				'Invalid message format',
			);
		}
		this.#library.handleMessage(msg, key, tokenInfo);
	}

	webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	): void | Promise<void> {
		const { key } = this.#getSocketInfo(ws);
		this.#clientConnections.remove(key);
		this.#socketInfoCache.delete(ws);
	}

	webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
		console.error('WebSocket error', error);
		const { key } = this.#getSocketInfo(ws);
		this.#clientConnections.remove(key);
		this.#socketInfoCache.delete(ws);
	}

	handleMessage = async (
		key: string,
		info: TokenInfo,
		message: ClientMessage,
	) => {
		return this.#library.handleMessage(message, key, info);
	};
}
