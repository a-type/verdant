import {
	ClientMessage,
	createOid,
	EventSubscriber,
	VerdantError,
} from '@verdant-web/common';
import {
	FileInfo,
	FileStorage,
	TokenInfo,
	UserProfiles,
} from '@verdant-web/server';
import {
	ClientConnectionManager,
	errorHandler,
	FileStorageLibraryDelegate,
	Library,
	LibraryEvents,
	SqlShardStorage,
	tokenMiddleware,
	TokenVerifier,
	UserProfileLoader,
} from '@verdant-web/server/internals';
import { Hono } from 'hono';
import { createDurableObjectSqliteExecutor } from './sql.js';

interface SocketMeta {
	tokenInfo: TokenInfo;
	key: string;
}

export interface DurableObjectLibraryConfig {
	tokenSecret: string;
	disableRebasing?: boolean;
	fileStorage: FileStorage;
	log?: (level: string, ...args: any[]) => void;
	profiles: UserProfiles<any>;
	storageOptions?: {
		fileDeleteExpirationDays?: number;
		replicaTruancyTimeout?: number;
	};
}

export class DurableObjectLibrary {
	#app: Hono<any>;
	#socketInfoCache: WeakMap<WebSocket, SocketMeta> = new WeakMap();
	#initialized = false;
	#config: DurableObjectLibraryConfig;

	protected clientConnections: ClientConnectionManager;
	protected library!: Library;
	protected events: EventSubscriber<LibraryEvents> = new EventSubscriber();

	constructor(
		private ctx: DurableObjectState,
		verdant: DurableObjectLibraryConfig,
	) {
		this.#config = verdant;

		this.clientConnections = new ClientConnectionManager({
			profiles: new UserProfileLoader(this.#config.profiles),
		});

		ctx.getWebSockets().forEach((ws) => {
			// restore socket info after hibernation
			const info = ws.deserializeAttachment() as SocketMeta | undefined;
			if (info) {
				this.#socketInfoCache.set(ws, info);
			}
		});

		this.#app = new Hono()
			.onError(errorHandler)
			.use(async (ctx, next) => {
				console.log(`[verdant object]`, ctx.req.url);
				await next();
			})
			.use(tokenMiddleware(new TokenVerifier({ secret: verdant.tokenSecret })))
			.use(async (ctx, next) => {
				// only after authorization, migrate the database
				await this.initialize(ctx.get('tokenInfo').libraryId);
				return next();
			})
			.post('/', async (ctx) => {
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
				const finish = this.clientConnections.addFetch(
					ctx.get('key'),
					ctx.req.raw,
					info,
				);
				for (const message of body.messages) {
					await this.library.handleMessage(message, ctx.get('key'), info);
				}
				const res = finish();
				return res;
			})
			.post('/files/:fileId', async (ctx) => {
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

				const fileInfo: FileInfo = {
					id,
					libraryId: info.libraryId,
					fileName: file.name,
					type: file.type,
				};
				await verdant.fileStorage.put(file.stream(), fileInfo);
				await this.library.putFileInfo(fileInfo);

				return ctx.json({ success: true });
			})
			.get('/files/:fileId', async (ctx) => {
				const id = ctx.req.param('fileId');
				if (!id) {
					throw new VerdantError(
						VerdantError.Code.NotFound,
						undefined,
						'Supply a file ID as a path parameters',
					);
				}

				const fileInfo = await this.library.getFileInfo(id);
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
			.all('*', async (ctx) => {
				this.log('debug', '[verdant object] socket upgrade request');
				// WebSocket endpoint
				const upgradeHeader = ctx.req.header('Upgrade');
				if (upgradeHeader !== 'websocket') {
					return ctx.json({ error: 'Upgrade to WebSocket required' }, 400);
				}

				const info = ctx.get('tokenInfo');

				const websocketPair = new WebSocketPair();
				const [client, server] = Object.values(websocketPair);

				this.ctx.acceptWebSocket(server);
				this.log('debug', 'WebSocket connection established');

				const meta: SocketMeta = {
					tokenInfo: info,
					key: ctx.get('key'),
				};
				server.serializeAttachment(meta);
				this.#socketInfoCache.set(client, meta);

				this.clientConnections.addSocket(meta.key, server, info);

				return new Response(null, {
					status: 101,
					webSocket: client,
				});
			});

		// set auto-response for pings
		this.ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair(
				JSON.stringify({ type: 'heartbeat' }),
				JSON.stringify({
					type: 'heartbeat-response',
				}),
			),
		);
	}

	#noop = () => {};
	get log() {
		return this.#config.log || this.#noop;
	}

	initialize = async (libraryId: string) => {
		if (this.#initialized) {
			return;
		}
		const storedLibraryId = await this.ctx.storage.get<string>('libraryId');
		if (storedLibraryId && storedLibraryId !== libraryId) {
			throw new VerdantError(
				VerdantError.Code.InvalidRequest,
				undefined,
				'Library ID does not match existing storage',
			);
		}
		await this.ctx.storage.put('libraryId', libraryId);
		this.#initialized = true;
		const db = createDurableObjectSqliteExecutor(this.ctx.storage, {
			log: this.log,
		});
		await db.migrate();
		const storage = new SqlShardStorage(db, {
			libraryId,
			fileDeleteExpirationDays:
				this.#config.storageOptions?.fileDeleteExpirationDays ?? 14,
			replicaTruancyMinutes:
				this.#config.storageOptions?.replicaTruancyTimeout ?? 14 * 24 * 60,
		});
		this.library = new Library({
			id: libraryId,
			storage,
			sender: this.clientConnections,
			events: this.events,
			disableRebasing: this.#config.disableRebasing,
			fileStorage: new FileStorageLibraryDelegate(
				libraryId,
				this.#config.fileStorage,
			),
			log: this.log,
			presence: this.clientConnections.presence,
		});
	};
	#restore = async () => {
		if (this.#initialized) {
			return;
		}
		const storedLibraryId = await this.ctx.storage.get<string>('libraryId');
		if (storedLibraryId) {
			await this.initialize(storedLibraryId);
		}
	};

	fetch = async (request: Request) => {
		return this.#app.fetch(request);
	};

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

	webSocketMessage = (
		ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> => {
		const { tokenInfo, key } = this.#getSocketInfo(ws);
		const msg = JSON.parse(message.toString()) as ClientMessage | null;
		if (!msg) {
			throw new VerdantError(
				VerdantError.Code.InvalidRequest,
				undefined,
				'Invalid message format',
			);
		}
		this.library.handleMessage(msg, key, tokenInfo);
	};

	webSocketClose = (
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	): void | Promise<void> => {
		const { key } = this.#getSocketInfo(ws);
		this.log('info', 'WebSocket closed', { key, code, reason, wasClean });
		this.clientConnections.remove(key);
		this.#socketInfoCache.delete(ws);
	};

	webSocketError = (ws: WebSocket, error: unknown): void | Promise<void> => {
		this.log('error', 'WebSocket error', error);
		const { key } = this.#getSocketInfo(ws);
		this.clientConnections.remove(key);
		this.#socketInfoCache.delete(ws);
	};

	handleMessage = async (
		key: string,
		info: TokenInfo,
		message: ClientMessage,
	) => {
		await this.#restore();
		return this.library.handleMessage(message, key, info);
	};

	// public library API
	getDocumentSnapshot = async (collection: string, id: string) => {
		await this.#restore();
		return this.library.getDocumentSnapshot(
			createOid(collection, id),
		) as Promise<{} | null>;
	};
	getFileInfo = async (fileId: string) => {
		await this.#restore();
		return this.library.getFileInfo(fileId);
	};
	evict = async () => {
		await this.#restore();
		await this.clientConnections.disconnectAll();
		await this.library?.destroy();
		await this.ctx.storage.deleteAll();
		this.#initialized = false;
	};
	forceTruant = async (replicaId: string) => {
		await this.#restore();
		return this.library.forceTruant(replicaId);
	};
	getInfo = async () => {
		await this.#restore();
		return this.library.getInfo();
	};
}
