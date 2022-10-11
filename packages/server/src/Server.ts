import { ClientMessage, ServerMessage } from '@lofi-db/common';
import EventEmitter from 'events';
import { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { UserProfiles } from './Profiles.js';
import { ServerStorage } from './ServerStorage.js';
import create from 'better-sqlite3';
import { MessageSender } from './MessageSender.js';

export interface ServerOptions {
	/**
	 * Attach to a pre-existing HTTP server. Provide this if you have another server,
	 * like an Express server, that you want to add lofi to. If provided, you don't
	 * need to call .listen()
	 */
	httpServer?: HttpServer;
	/**
	 * Associate a socket connection or any incoming request with a particular user.
	 * You must also provide the library ID you want to give access to for this connection.
	 * The full incoming request is provided to make authentication and authorization decisions,
	 * like looking up a cookie or inspecting the path.
	 */
	authorize: (
		req: IncomingMessage,
	) => Promise<{ userId: string; libraryId: string }>;
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
}

class DefaultProfiles implements UserProfiles<{ id: string }> {
	get = async (userId: string) => {
		return { id: userId };
	};
}

export class Server extends EventEmitter implements MessageSender {
	private httpServer: HttpServer;
	private wss: WebSocketServer;
	private storage: ServerStorage;

	private replicaToConnectionMap = new Map<string, WebSocket>();
	private libraryToConnectionMap = new Map<string, WebSocket[]>();
	private connectionToReplicaIdMap = new WeakMap<WebSocket, string>();

	constructor(options: ServerOptions) {
		super();

		this.storage = new ServerStorage(
			create(options.databaseFile),
			this,
			options.profiles || new DefaultProfiles(),
		);

		this.wss = new WebSocketServer({
			noServer: true,
		});

		this.wss.on('connection', this.handleConnection);

		this.httpServer = options.httpServer || new HttpServer();

		this.httpServer.on('upgrade', async (req, socket, head) => {
			try {
				const info = await options.authorize(req);
				this.wss.handleUpgrade(req, socket, head, (ws) => {
					this.wss.emit('connection', ws, req, info);
				});
			} catch (e) {
				this.emit('error', e);
				socket.destroy();
			}
		});
	}

	broadcast = (
		libraryId: string,
		message: ServerMessage,
		omitReplicas: string[] = [],
	) => {
		const connections = this.libraryToConnectionMap.get(libraryId) || [];
		for (const connection of connections) {
			const replicaId = this.connectionToReplicaIdMap.get(connection);
			if (replicaId && !omitReplicas.includes(replicaId)) {
				connection.send(JSON.stringify(message));
			}
		}
	};

	send = (libraryId: string, replicaId: string, message: ServerMessage) => {
		const connection = this.replicaToConnectionMap.get(replicaId);
		if (connection) {
			connection.send(JSON.stringify(message));
		}
	};

	private handleConnection = (
		ws: WebSocket,
		req: IncomingMessage,
		info: { userId: string; libraryId: string },
	) => {
		const connections = this.libraryToConnectionMap.get(info.libraryId) || [];
		connections.push(ws);
		this.libraryToConnectionMap.set(info.libraryId, connections);

		ws.on('message', (message: any) => {
			const data = JSON.parse(message.toString()) as ClientMessage;

			if (data.type === 'sync') {
				this.replicaToConnectionMap.set(data.replicaId, ws);
				this.connectionToReplicaIdMap.set(ws, data.replicaId);
			}

			this.storage.receive(info.libraryId, data, info.userId);
		});

		ws.on('close', () => {
			const replicaId = this.connectionToReplicaIdMap.get(ws);
			if (!replicaId) {
				this.emit('warning', 'Unknown replica disconnected', ws);
				return;
			}

			this.storage.remove(info.libraryId, replicaId);
			this.replicaToConnectionMap.delete(replicaId);
			const connections = this.libraryToConnectionMap.get(info.libraryId);
			if (connections) {
				connections.splice(connections.indexOf(ws), 1);
			}
		});
	};

	listen = (...params: Parameters<HttpServer['listen']>) => {
		this.httpServer.listen(...params);
	};
}
