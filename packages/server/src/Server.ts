import {
	assert,
	ClientMessage,
	createOid,
	DocumentBaseline,
	FileData,
	generateId,
	Operation,
	ServerMessage,
	VerdantError,
} from '@verdant-web/common';
import busboy from 'busboy';
import EventEmitter from 'events';
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import { TransformStream } from 'node:stream/web';
import internal, { Readable } from 'stream';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { ClientConnectionManager } from './ClientConnection.js';
import { FileMetadata, FileMetadataConfig } from './files/FileMetadata.js';
import { FileInfo, FileStorage } from './files/FileStorage.js';
import { MessageSender } from './MessageSender.js';
import { migrations } from './migrations.js';
import { UserProfileLoader, UserProfiles } from './Profiles.js';
import { ReplicaKeepaliveTimers } from './ReplicaKeepaliveTimers.js';
import { ServerLibrary } from './ServerLibrary.js';
import { TokenInfo, TokenVerifier } from './TokenVerifier.js';
import { Storage, StorageFactory } from './storage/Storage.js';

export interface ServerOptions {
	/**
	 * Attach to a pre-existing HTTP server. Provide this if you have another server,
	 * like an Express server, that you want to add lofi to. If provided, you don't
	 * need to call .listen()
	 */
	httpServer?: HttpServer;
	/**
	 * The secret value used to generate tokens from your authentication endpoint.
	 * Used to verify and decode user identity and library access on connection.
	 */
	tokenSecret: string;
	/**
	 * Your storage implementation. See the sqlStorage export for a built-in
	 * option.
	 */
	storage: StorageFactory;
	/**
	 * Optionally provide an implementation of the UserProfiles interface to look up
	 * static user profile data to use in persistence. This data is considered trusted
	 * and can be used to identify users with information like name or profile image.
	 */
	profiles?: UserProfiles<any>;
	/**
	 * How many minutes of inactivity before a replica is considered truant and
	 * removed from the library. Defaults to 30 days.
	 */
	replicaTruancyMinutes?: number;
	/**
	 * Supply a logging function to log debug messages.
	 */
	log?: (...args: any[]) => void;
	/**
	 * Disable history compaction. Storage usage will grow indefinitely. Not recommended.
	 */
	disableRebasing?: boolean;
	/**
	 * Provide a FileStorage backend to accept file uploads. Without a file backend,
	 * users will not be able to synchronize files, and all files added on peer replicas
	 * will be forever unavailable.
	 *
	 * A default, filesystem-backed FileStorage implementation is provided as an export
	 * of this library.
	 */
	fileStorage?: FileStorage;
	fileConfig?: FileMetadataConfig;
}

class DefaultProfiles implements UserProfiles<{ id: string }> {
	get = async (userId: string) => {
		return { id: userId };
	};
}

export interface ServerEvents {
	error: (err: any) => void;
	warning: (msg: string, ...args: any[]) => void;
	changes: (
		info: Omit<TokenInfo, 'token'>,
		operations: Operation[],
		baselines: DocumentBaseline[],
	) => void;
	request: (info: TokenInfo) => void;
	'socket-close': (info: TokenInfo) => void;
	'socket-connection': (info: TokenInfo) => void;
}

export declare interface Server {
	on<Event extends keyof ServerEvents>(
		ev: Event,
		cb: ServerEvents[Event],
	): this;
	off<Event extends keyof ServerEvents>(
		ev: Event,
		cb: ServerEvents[Event],
	): this;
	emit<Event extends keyof ServerEvents>(
		ev: Event,
		...args: Parameters<ServerEvents[Event]>
	): boolean;
}

export class Server extends EventEmitter implements MessageSender {
	private httpServer!: HttpServer;
	private wss: WebSocketServer;
	private fileStorage?: FileStorage;
	private storage: Storage;
	private library;

	private clientConnections = new ClientConnectionManager();
	private keepalives = new ReplicaKeepaliveTimers();

	private tokenVerifier;

	private connectionToReplicaIdMap = new WeakMap<WebSocket, string>();

	private log: (...args: any[]) => void = () => {};

	private __testMode = false;

	constructor(options: ServerOptions) {
		super();

		this.__testMode =
			process.env.NODE_ENV === 'test' && process.env.VITEST === 'true';

		this.log = options.log || this.log;

		this.tokenVerifier = new TokenVerifier({
			secret: options.tokenSecret,
		});

		this.fileStorage = options.fileStorage;
		this.storage = options.storage({
			fileDeleteExpirationDays: options.fileConfig?.deleteExpirationDays ?? 14,
			replicaTruancyMinutes: options.replicaTruancyMinutes || 60 * 24 * 14,
		});

		this.library = new ServerLibrary({
			storage: this.storage,
			sender: this,
			profiles: new UserProfileLoader(
				options.profiles || new DefaultProfiles(),
			),
			log: this.log,
			disableRebasing: options.disableRebasing,
			fileStorage: this.fileStorage,
		});

		this.library.subscribe(
			'changes',
			({ token, ...info }, operations, baselines) => {
				this.emit('changes', info, operations, baselines);
			},
		);

		this.wss = new WebSocketServer({
			noServer: true,
		});

		this.wss.on('connection', this.handleConnection);

		if (options.httpServer) {
			// backwards compat with old httpServer option - it didn't attach path handlers
			this.attach(options.httpServer, { httpPath: false });
		} else {
			this.attach(new HttpServer(this.createInternalRequestHandler()));
		}

		this.keepalives.subscribe('lost', this.library.remove);
	}

	/**
	 * Attaches the Verdant server to an HttpServer instance, which
	 * allows it to handle requests and websockets required for the
	 * Verdant protocol.
	 *
	 * You can pass httpPath = false if you want to handle HTTP requests
	 * yourself, and this will only attach the websocket handling.
	 */
	attach = (
		server: HttpServer,
		options: { httpPath?: string | false } = {},
	) => {
		if (this.httpServer) {
			this.httpServer.off('upgrade', this.handleUpgrade);
		}
		this.httpServer = server;
		this.httpServer.on('upgrade', this.handleUpgrade);

		if (options.httpPath !== false) {
			this.httpServer.on(
				'request',
				this.createInternalRequestHandler(options.httpPath),
			);
		}
	};

	/**
	 * Handles an HTTP upgrade request to a websocket connection.
	 */
	handleUpgrade = async (
		req: IncomingMessage,
		socket: internal.Duplex,
		head: Buffer,
	) => {
		try {
			const info = this.authorizeRequest(req);
			this.wss.handleUpgrade(req, socket, head, (ws) => {
				this.wss.emit('connection', ws, req, info);
			});
		} catch (e) {
			this.emit('error', e);
			if (e instanceof VerdantError && e.httpStatus === 401) {
				socket.write(
					'HTTP/1.1 401 Unauthorized\r\n' +
						'Connection: close\r\n' +
						'Content-Length: 0\r\n' +
						'\r\n',
				);
			}
			socket.destroy();
		}
	};

	private authorizeRequest = (req: IncomingMessage | Request) => {
		return this.tokenVerifier.verifyToken(this.getRequestToken(req));
	};

	private getRequestToken = (req: IncomingMessage | Request) => {
		if (isFetch(req)) {
			const authHeader = req.headers.get('Authorization');
			assert(authHeader, 'Token is required');
			const [type, token] = authHeader.split(' ');
			if (type === 'Bearer') {
				return token;
			}
			return token;
		}

		if (req.headers.authorization) {
			const [type, token] = req.headers.authorization.split(' ');
			if (type === 'Bearer') {
				return token;
			}
		}

		if (req.headers['sec-websocket-protocol']) {
			// hack: read the token from the websocket protocol header
			const [type, token] = req.headers['sec-websocket-protocol'].split(',');
			if (type === 'Bearer') {
				return token.trim();
			}
		}

		assert(req.url, 'Request URL is required');
		const url = new URL(req.url, 'http://localhost');
		const token = url.searchParams.get('token');
		assert(token, 'Token is required');
		return token;
	};

	private createInternalRequestHandler = (pathPrefix = '/sync') => {
		const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
			const url = new URL(req.url || '', 'http://localhost');
			if (url.pathname.startsWith('sync')) {
				if (url.pathname === 'sync') {
					return this.handleRequest(req, res);
				} else if (url.pathname.startsWith('/sync/files/')) {
					return this.handleFileRequest(req, res);
				}
			} else {
				res.writeHead(404);
				res.end();
			}
		};
		return handleRequest;
	};

	/**
	 * Handles an HTTP request from a verdant client.
	 */
	handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
		try {
			if (req.method === 'POST') {
				const info = this.authorizeRequest(req);

				const key = generateId();

				const finish = this.clientConnections.addRequest(
					info.libraryId,
					key,
					req,
					res,
					info,
				);

				// FIXME: extremely naive compatibility with connect-like
				// servers...
				const body: {
					messages: ClientMessage[];
				} =
					(req as any).body ??
					(await new Promise<string>((resolve, reject) => {
						let body = '';
						req.on('data', (chunk) => {
							body += chunk;
						});
						req.on('end', () => {
							resolve(JSON.parse(body));
						});
						req.on('error', (e) => {
							reject(e);
						});
					}));

				await this.handleRequestBody(key, info, body);

				finish();

				this.emit('request', info);
			}
		} catch (e) {
			return this.writeErrorResponse(e, res);
		}
	};

	/**
	 * Handles a "fetch" style request. Complement to handleRequest, for servers
	 * that use Request/Response style handlers.
	 */
	handleFetch = async (req: Request): Promise<Response> => {
		try {
			const info = this.authorizeRequest(req);
			const key = generateId();

			const finish = this.clientConnections.addFetch(
				info.libraryId,
				key,
				req,
				info,
			);

			const body = (await req.json()) as
				| { messages: ClientMessage[] }
				| null
				| undefined;

			if (!body) {
				throw new VerdantError(VerdantError.Code.BodyRequired);
			}

			await this.handleRequestBody(key, info, body);

			const res = finish();

			this.emit('request', info);

			return res;
		} catch (e) {
			return this.getErrorResponse(e);
		}
	};

	private handleRequestBody = async (
		key: string,
		info: TokenInfo,
		body: { messages: ClientMessage[] },
	) => {
		for (const message of body.messages) {
			await this.handleMessage(key, info, message);
		}

		// update our keepalive timers for presence management
		const firstMessage = body.messages[0];
		if (firstMessage) {
			this.keepalives.refresh(info.libraryId, firstMessage.replicaId);
		}
	};

	private writeErrorResponse(e: unknown, res: ServerResponse) {
		this.emit('error', e);
		this.log('error', 'Error handling request', e);

		if (e instanceof VerdantError) {
			// write error data to response
			res.writeHead(e.httpStatus);
			res.write(JSON.stringify(e.toResponse()));
		} else {
			res.writeHead(500);
			res.write(
				JSON.stringify(
					new VerdantError(VerdantError.Code.Unexpected).toResponse(),
				),
			);
		}
		res.end();
	}

	// for fetch-style
	private getErrorResponse(e: unknown) {
		this.emit('error', e);
		this.log('error', 'Error handling request', e);

		if (e instanceof VerdantError) {
			return new Response(JSON.stringify(e.toResponse()), {
				status: e.httpStatus,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} else {
			return new Response(
				JSON.stringify(
					new VerdantError(VerdantError.Code.Unexpected).toResponse(),
				),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}
	}

	/**
	 * Handles a multipart upload of a file from a verdant client. The upload
	 * will include parameters for the file's ID, name, and type. The request
	 * must be authenticated with a token to tie it to a library.
	 */
	handleFileRequest = async (req: IncomingMessage, res: ServerResponse) => {
		try {
			const info = this.authorizeRequest(req);

			const url = new URL(
				(req as any).originalUrl || (req as any).baseUrl || req.url || '',
				'http://localhost',
			);

			const id = url.pathname.split('/').pop();

			if (!id || id === 'files') {
				throw new VerdantError(VerdantError.Code.NotFound);
			}

			if (req.method === 'POST') {
				await this.streamIncomingFile({
					req,
					info,
					headers: req.headers,
					id,
				});
				this.log('info', 'File upload complete', id);
				res.writeHead(200);
				res.write(JSON.stringify({ success: true }));
				res.end();
			} else if (req.method === 'GET') {
				const data = await this.getFileData(info, id);
				res.writeHead(200, {
					'Content-Type': 'application/json',
				});
				res.write(JSON.stringify(data));
				res.end();
			}
		} catch (e) {
			return this.writeErrorResponse(e, res);
		}
	};

	/**
	 * Handles a "fetch" style file request. Complement to handleFileRequest,
	 * for servers that use Request/Response style handlers.
	 */
	handleFileFetch = async (req: Request): Promise<Response> => {
		this.log('info', 'Handling file fetch', req.url, req.method);
		try {
			const info = this.authorizeRequest(req);

			const url = new URL(req.url, 'http://localhost');

			const id = url.pathname.split('/').pop();

			if (!id || id === 'files') {
				throw new VerdantError(VerdantError.Code.NotFound);
			}

			if (req.method === 'POST') {
				if (!req.body) {
					throw new VerdantError(VerdantError.Code.InvalidRequest);
				}

				const headersAsRecord = Array.from(req.headers.entries()).reduce(
					(acc, [key, value]) => {
						acc[key] = value;
						return acc;
					},
					{} as Record<string, string | string[] | undefined>,
				);

				// this is needed because Node's webstreams don't
				// like itty's polyfill streams
				const intermediate = new TransformStream();
				req.body.pipeTo(intermediate.writable);

				await this.streamIncomingFile({
					req: Readable.fromWeb(intermediate.readable),
					info,
					headers: headersAsRecord,
					id,
				});
				this.log('info', 'File upload complete', id);
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				});
			} else if (req.method === 'GET') {
				const data = await this.getFileData(info, id);
				return new Response(JSON.stringify(data), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				});
			} else {
				throw new VerdantError(VerdantError.Code.InvalidRequest);
			}
		} catch (e) {
			return this.getErrorResponse(e);
		}
	};

	private getFileStorageOrThrow = () => {
		if (!this.fileStorage) {
			throw new VerdantError(VerdantError.Code.NoFileStorage);
		}
		return this.fileStorage;
	};

	private streamIncomingFile = ({
		id,
		req,
		headers,
		info,
	}: {
		req: Readable;
		headers: Record<string, string | string[] | undefined>;
		id: string;
		info: TokenInfo;
	}) => {
		const fs = this.getFileStorageOrThrow();

		return new Promise((resolve, reject) => {
			const bb = busboy({ headers });

			bb.on('file', async (fieldName, stream, fileInfo) => {
				// too many 'info's....
				const lofiFileInfo: FileInfo = {
					id,
					libraryId: info.libraryId,
					fileName: fileInfo.filename,
					type: fileInfo.mimeType,
				};
				// write metadata to storage
				try {
					await this.storage.ready;
					await this.storage.fileMetadata.put(info.libraryId, lofiFileInfo);
					fs.put(stream, lofiFileInfo);
				} catch (e) {
					reject(e);
				}
			});
			bb.on('field', (fieldName, value) => {
				if (fieldName === 'file') {
					if (this.__testMode) {
						// this isn't right in the real world, but in testing it's
						// the only way we get file data.
						// we create a stream from the data and pass it as if it
						// were a file stream
						const stream = new Readable();
						stream.push(value);
						stream.push(null);
						const fileInfo = {
							filename: 'test.txt',
							mimeType: 'text/plain',
						};
						bb.emit('file', fieldName, stream, fileInfo);
					} else {
						throw new Error('Invalid file upload');
					}
				}
			});

			req.pipe(bb);
			bb.on('finish', resolve);
			bb.on('error', reject);
		});
	};

	private getFileData = async (
		info: TokenInfo,
		id: string,
	): Promise<FileData> => {
		const fs = this.getFileStorageOrThrow();

		await this.storage.ready;
		const fileInfo = await this.storage.fileMetadata.get(info.libraryId, id);
		if (!fileInfo) {
			throw new VerdantError(
				VerdantError.Code.NotFound,
				undefined,
				`File ${id} not found`,
			);
		}

		const url = await fs.getUrl({
			fileName: fileInfo.name,
			id: fileInfo.fileId,
			libraryId: info.libraryId,
			type: fileInfo.type,
		});

		return {
			id: fileInfo.fileId,
			url,
			remote: true,
			name: fileInfo.name,
			type: fileInfo.type,
		};
	};

	broadcast = (
		libraryId: string,
		message: ServerMessage,
		omitKeys: string[] = [],
	) => {
		this.clientConnections.broadcast(libraryId, message, omitKeys);
	};

	send = (libraryId: string, key: string, message: ServerMessage) => {
		this.clientConnections.respond(libraryId, key, message);
	};

	private handleMessage = (
		clientKey: string,
		info: TokenInfo,
		message: ClientMessage,
	) => {
		this.log(
			'debug',
			'Got message from user',
			info.userId,
			', library',
			info.libraryId,
			JSON.stringify(message),
		);
		return this.library.receive(message, clientKey, info);
	};

	private handleConnection = (
		ws: WebSocket,
		req: IncomingMessage,
		info: TokenInfo,
	) => {
		const key = generateId();

		this.clientConnections.addSocket(info.libraryId, key, ws, info);

		ws.on('message', async (message: any) => {
			const data = JSON.parse(message.toString()) as ClientMessage;

			if (data.replicaId) {
				this.connectionToReplicaIdMap.set(ws, data.replicaId);
				this.keepalives.refresh(info.libraryId, data.replicaId);
			}

			await this.handleMessage(key, info, data);
		});

		ws.on('close', () => {
			const replicaId = this.connectionToReplicaIdMap.get(ws);
			if (!replicaId) {
				this.emit('warning', 'Unknown replica disconnected', ws);
				return;
			}

			this.library.remove(info.libraryId, replicaId);

			this.emit('socket-close', info);
		});

		this.emit('socket-connection', info);
	};

	listen = (...params: Parameters<HttpServer['listen']>) => {
		this.httpServer.listen(...params);
	};

	close = async () => {
		await Promise.all([
			new Promise<void>((resolve) => {
				setTimeout(() => {
					this.log('warn', 'HTTP server close timed out');
					resolve();
				}, 5 * 1000);
				this.httpServer.close(() => {
					resolve();
					this.log('info', 'HTTP server closed');
				});
			}),
			new Promise<void>((resolve) => {
				setTimeout(() => {
					this.log('warn', 'Socket server close timed out');
					resolve();
				}, 5 * 1000);
				this.wss.close(() => {
					resolve();
					this.log('info', 'Socket server closed');
				});
			}),
		]);
		await this.storage.close();
	};

	/**
	 * Completely remove a library from the server.
	 * This will remove all data associated with the library.
	 * Use it very carefully! Data will still be stored on user
	 * devices, so this is not as scary as it sounds - the next time
	 * any replica connects, it will repopulate the library. But
	 * you should still be careful.
	 */
	evictLibrary = (libraryId: string) => {
		// disconnect all clients
		this.clientConnections.disconnectAll(libraryId);
		this.library.destroy(libraryId);
		this.log('info', 'Evicted library', libraryId);
	};

	/**
	 * Returns currently connected replica info for a library
	 */
	getLibraryPresence = (libraryId: string) => {
		return this.library.getPresence(libraryId);
	};

	/**
	 * Returns helpful information about a library.
	 * This is currently only the known replicas and some
	 * more low-level metadata.
	 */
	getLibraryInfo = (libraryId: string) => {
		return this.library.getInfo(libraryId);
	};

	/**
	 * Removes all replicas associated with a User ID from
	 * the server. Consistency algorithms will no longer wait on these
	 * replicas before confirming and squashing changes.
	 */
	evictUser = (libraryId: string, userId: string) => {
		this.library.evictUser(libraryId, userId);
		this.log('info', 'Evicted user', userId, 'from library', libraryId);
	};

	/**
	 * Retrieves a snapshot of the full document contents at this time.
	 * Useful for capturing the shape of data for static usage outside
	 * of the live system.
	 */
	getDocumentSnapshot = (
		libraryId: string,
		collection: string,
		documentId: string,
	) => {
		return this.library.getDocumentSnapshot(
			libraryId,
			createOid(collection, documentId),
		);
	};
}

function isFetch(request: Request | IncomingMessage): request is Request {
	return 'json' in request;
}
