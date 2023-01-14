import {
	assert,
	ClientMessage,
	generateId,
	ServerMessage,
} from '@lo-fi/common';
import EventEmitter from 'events';
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { UserProfiles } from './Profiles.js';
import { ServerStorage } from './ServerStorage.js';
import create from 'better-sqlite3';
import { MessageSender } from './MessageSender.js';
import { URL } from 'url';
import { ClientConnectionManager } from './ClientConnection.js';
import { ReplicaKeepaliveTimers } from './ReplicaKeepaliveTimers.js';
import { TokenInfo, TokenVerifier } from './TokenVerifier.js';

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
}

class DefaultProfiles implements UserProfiles<{ id: string }> {
	get = async (userId: string) => {
		return { id: userId };
	};
}

export class Server extends EventEmitter implements MessageSender {
	readonly httpServer: HttpServer;
	private wss: WebSocketServer;
	private storage: ServerStorage;

	private clientConnections = new ClientConnectionManager();
	private keepalives = new ReplicaKeepaliveTimers();

	private tokenVerifier;

	private connectionToReplicaIdMap = new WeakMap<WebSocket, string>();

	private log: (...args: any[]) => void = () => {};

	constructor(options: ServerOptions) {
		super();

		this.log = options.log || this.log;

		this.tokenVerifier = new TokenVerifier({
			secret: options.tokenSecret,
		});

		this.storage = new ServerStorage({
			db: create(options.databaseFile),
			sender: this,
			profiles: options.profiles || new DefaultProfiles(),
			replicaTruancyMinutes: options.replicaTruancyMinutes || 60 * 24 * 30,
			log: this.log,
			disableRebasing: options.disableRebasing,
		});

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
				socket.destroy();
			}
		});

		this.keepalives.subscribe('lost', this.storage.remove);
	}

	private authorizeRequest = (req: IncomingMessage) => {
		return this.tokenVerifier.verifyToken(this.getRequestToken(req));
	};

	private getRequestToken = (req: IncomingMessage) => {
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
			return this.handleRequest(req, res);
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

				for (const message of body.messages) {
					await this.handleMessage(key, info, message);
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
			this.emit('error', e);
			res.writeHead(500);
			res.end();
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
		return this.storage.receive(info.libraryId, clientKey, message, info);
	};

	private handleConnection = (
		ws: WebSocket,
		req: IncomingMessage,
		info: TokenInfo,
	) => {
		const key = generateId();

		this.clientConnections.addSocket(info.libraryId, key, ws);

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

			this.storage.remove(info.libraryId, replicaId);

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
		this.storage.evictLibrary(libraryId);
		this.log('Evicted library', libraryId);
	};

	getLibraryPresence = (libraryId: string) => {
		return this.storage.getLibraryPresence(libraryId);
	};

	/**
	 * Removes all replicas associated with a User ID from
	 * the server. Consistency algorithms will no longer wait on these
	 * replicas before confirming and squashing changes.
	 */
	evictUser = (libraryId: string, userId: string) => {
		this.storage.evictUser(libraryId, userId);
		this.log('Evicted user', userId, 'from library', libraryId);
	};
}
