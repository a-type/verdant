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
import EventEmitter from 'events';
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { UserProfileLoader, UserProfiles } from './Profiles.js';
import create from 'better-sqlite3';
import { MessageSender } from './MessageSender.js';
import { URL } from 'url';
import { ClientConnectionManager } from './ClientConnection.js';
import { ReplicaKeepaliveTimers } from './ReplicaKeepaliveTimers.js';
import { TokenInfo, TokenVerifier } from './TokenVerifier.js';
import busboy from 'busboy';
import { FileInfo, FileStorage } from './files/FileStorage.js';
import { Readable } from 'stream';
import { FileMetadata, FileMetadataConfig } from './files/FileMetadata.js';
import { ServerLibrary } from './ServerLibrary.js';
import { migrations } from './migrations.js';

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
	 * The path to your SQLite database.
	 */
	databaseFile: string;
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
	readonly httpServer: HttpServer;
	private wss: WebSocketServer;
	private fileStorage?: FileStorage;
	private fileMetadata;
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

		const db = create(options.databaseFile);
		migrations(db);

		this.fileMetadata = new FileMetadata(db, options.fileConfig);

		this.library = new ServerLibrary({
			db,
			sender: this,
			profiles: new UserProfileLoader(
				options.profiles || new DefaultProfiles(),
			),
			log: this.log,
			disableRebasing: options.disableRebasing,
			fileMetadata: this.fileMetadata,
			fileStorage: this.fileStorage,
			replicaTruancyMinutes: options.replicaTruancyMinutes || 60 * 24 * 14,
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

		this.httpServer =
			options.httpServer || new HttpServer(this.internalServerHandleRequest);

		this.httpServer.on('upgrade', async (req, socket, head) => {
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
		});

		this.keepalives.subscribe('lost', this.library.remove);
	}

	private authorizeRequest = (req: IncomingMessage) => {
		return this.tokenVerifier.verifyToken(this.getRequestToken(req));
	};

	private getRequestToken = (req: IncomingMessage) => {
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

	private internalServerHandleRequest = (
		req: IncomingMessage,
		res: ServerResponse,
	) => {
		const url = new URL(req.url || '', 'http://localhost');
		if (url.pathname.startsWith('lofi')) {
			if (url.pathname === 'lofi') {
				return this.handleRequest(req, res);
			} else if (url.pathname.startsWith('/lofi/files/')) {
				return this.handleFileRequest(req, res);
			}
		} else {
			res.writeHead(404);
			res.end();
		}
	};

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

				try {
					for (const message of body.messages) {
						await this.handleMessage(key, info, message);
					}
				} catch (e) {
					this.emit('error', e);
					res.writeHead(500);
					res.end();
					return;
				}

				// update our keepalive timers for presence management
				const firstMessage = body.messages[0];
				if (firstMessage) {
					this.keepalives.refresh(info.libraryId, firstMessage.replicaId);
				}

				finish();

				this.emit('request', info);
			}
		} catch (e) {
			return this.sendErrorResponse(e, res);
		}
	};

	private sendErrorResponse(e: unknown, res: ServerResponse) {
		this.emit('error', e);
		this.log('Error handling request', e);

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

	/**
	 * Handles a multipart upload of a file from a verdant client. The upload
	 * will include parameters for the file's ID, name, and type. The request
	 * must be authenticated with a token to tie it to a library.
	 */
	handleFileRequest = async (req: IncomingMessage, res: ServerResponse) => {
		const fs = this.fileStorage;
		if (!fs) {
			this.emit(
				'error',
				new Error(
					'No file storage configured, but a client attempted to upload a file.',
				),
			);
			res.writeHead(500);
			res.write('File storage is not configured');
			res.end();
			return;
		}

		// FIXME: rather than trying to support Express, I should
		// just expose regular methods you call from whatever HTTP handler...
		const url = new URL(
			(req as any).originalUrl || (req as any).baseUrl || req.url || '',
			'http://localhost',
		);

		const id = url.pathname.split('/').pop();

		if (!id || id === 'files') {
			res.writeHead(400);
			res.write(
				'File ID is required to be in the URL path as the last parameter',
			);
			res.end();
			return;
		}

		try {
			if (req.method === 'POST') {
				const info = this.authorizeRequest(req);
				await new Promise((resolve, reject) => {
					const bb = busboy({ headers: req.headers });

					bb.on('file', (fieldName, stream, fileInfo) => {
						// too many 'info's....
						const lofiFileInfo: FileInfo = {
							id,
							libraryId: info.libraryId,
							fileName: fileInfo.filename,
							type: fileInfo.mimeType,
						};
						// write metadata to storage
						try {
							this.fileMetadata.put(info.libraryId, lofiFileInfo);
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
				this.log('File upload complete');
				res.writeHead(200);
				res.write(JSON.stringify({ success: true }));
				res.end();
			} else if (req.method === 'GET') {
				const info = this.authorizeRequest(req);

				const fileInfo = this.fileMetadata.get(info.libraryId, id);
				if (!fileInfo) {
					res.writeHead(404);
					res.end();
					return;
				}

				const url = await fs.getUrl({
					fileName: fileInfo.name,
					id: fileInfo.fileId,
					libraryId: info.libraryId,
					type: fileInfo.type,
				});
				res.writeHead(200, {
					'Content-Type': 'application/json',
				});
				// we need to augment that data with the URL from the file backend.
				// and generally enforce the FileData interface here...
				const data: FileData = {
					id: fileInfo.fileId,
					url,
					remote: true,
					name: fileInfo.name,
					type: fileInfo.type,
				};
				res.write(JSON.stringify(data));
				res.end();
			}
		} catch (e) {
			return this.sendErrorResponse(e, res);
		}
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
					console.warn('HTTP server close timed out');
					resolve();
				}, 5 * 1000);
				this.httpServer.close(() => {
					resolve();
					this.log('HTTP server closed');
				});
			}),
			new Promise<void>((resolve) => {
				setTimeout(() => {
					console.warn('Socket server close timed out');
					resolve();
				}, 5 * 1000);
				this.wss.close(() => {
					resolve();
					this.log('Socket server closed');
				});
			}),
		]);
		this.library.close();
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
		this.log('Evicted library', libraryId);
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
		this.log('Evicted user', userId, 'from library', libraryId);
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
