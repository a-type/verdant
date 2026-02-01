import { authz, EventSubscriber, ServerMessage } from '@verdant-web/common';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket as WSWebSocket } from 'ws';
import { Logger } from '../logger.js';
import { UserProfileLoader } from '../Profiles.js';
import { TokenInfo } from '../TokenVerifier.js';
import { MessageSender } from './MessageSender.js';
import { Presence, PresenceStorage } from './Presence.js';

abstract class ClientConnection {
	constructor(
		readonly key: string,
		protected readonly info: TokenInfo,
	) {}

	abstract handleMessage(message: ServerMessage): void;
	respond = (message: ServerMessage) => {
		this.handleMessage(this.processMessage(message));
	};

	private processMessage = (message: ServerMessage): ServerMessage => {
		switch (message.type) {
			case 'op-re': {
				return {
					...message,
					operations: message.operations.filter(this.filterAuthorizedData),
					baselines: message.baselines?.filter(this.filterAuthorizedData),
				};
			}
			case 'sync-resp': {
				return {
					...message,
					operations: message.operations.filter(this.filterAuthorizedData),
					baselines: message.baselines.filter(this.filterAuthorizedData),
				};
			}
			default:
				return message;
		}
	};

	private filterAuthorizedData = (operation: { authz?: string }) => {
		if (operation.authz) {
			const decoded = authz.decode(operation.authz);
			// TODO: support more authz operations and types
			return decoded.subject === this.info.userId;
		}
		return true;
	};
}

class RequestClientConnection extends ClientConnection {
	readonly type = 'request';

	private responses: ServerMessage[] = [];

	constructor(
		key: string,
		private readonly req: IncomingMessage,
		private readonly res: ServerResponse,
		info: TokenInfo,
	) {
		super(key, info);
	}

	handleMessage = (message: ServerMessage) => {
		this.responses.push(message);
	};

	end = () => {
		this.res.writeHead(200, {
			'Content-Type': 'application/json',
		});
		this.res.write(
			JSON.stringify({
				messages: this.responses,
			}),
		);
		this.res.end();
	};
}

class FetchClientConnection extends ClientConnection {
	readonly type = 'fetch';

	private responses: ServerMessage[] = [];
	res = new Response('', { status: 200 });

	constructor(
		key: string,
		private readonly req: Request,
		info: TokenInfo,
	) {
		super(key, info);
	}

	handleMessage = (message: ServerMessage) => {
		this.responses.push(message);
	};

	end = () => {
		this.res = new Response(
			JSON.stringify({
				messages: this.responses,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	};
}

function subscribeToSocketEvent(
	socket: WSWebSocket | WebSocket,
	event: string,
	handler: (data: any) => void,
) {
	if ('on' in socket) {
		(socket as WSWebSocket).on(event as any, handler);
		return () => (socket as WSWebSocket).off(event as any, handler);
	} else {
		(socket as WebSocket).addEventListener(event as any, (evt) =>
			handler((evt as any).data),
		);
		return () =>
			(socket as WebSocket).removeEventListener(event as any, handler);
	}
}

class WebSocketClientConnection extends ClientConnection {
	readonly type = 'websocket';

	constructor(
		key: string,
		// supports either NodeJS+WS mock websocket or native WebSocket
		// for Cloudflare / Edge environments
		readonly ws: WebSocket | WSWebSocket,
		info: TokenInfo,
	) {
		super(key, info);
	}

	handleMessage = (message: ServerMessage) => {
		return this.ws.send(JSON.stringify(message));
	};
}

export type ClientConnectionsManagerEvents = {
	replicaLost: (replicaId: string, connectionKey: string) => void;
};

export class ClientConnectionManager
	extends EventSubscriber<ClientConnectionsManagerEvents>
	implements MessageSender
{
	private readonly connections: Map<string, ClientConnection> = new Map();
	private connectionToUser: Map<string, string> = new Map();
	private userToConnections: Map<string, Set<string>> = new Map();
	readonly presence: Presence;
	private readonly log?: Logger;

	constructor({
		profiles,
		presenceStorage,
		log,
	}: {
		profiles: UserProfileLoader<any>;
		presenceStorage?: PresenceStorage;
		log?: Logger;
	}) {
		super();
		this.presence = new Presence(profiles, presenceStorage);
		this.log = log;
	}

	private addMappings(userId: string, connectionKey: string) {
		this.connectionToUser.set(connectionKey, userId);
		if (!this.userToConnections.has(userId)) {
			this.userToConnections.set(userId, new Set());
		}
		this.userToConnections.get(userId)!.add(connectionKey);
	}
	/**
	 * Removes back-mappings and, if all are deleted,
	 * also removes user presence.
	 */
	private removeMappings(connectionKey: string, autoRemoveOnEmpty = true) {
		const userId = this.connectionToUser.get(connectionKey);
		if (userId) {
			this.connectionToUser.delete(connectionKey);
			const connections = this.userToConnections.get(userId);
			if (connections) {
				connections.delete(connectionKey);
				if (connections.size === 0) {
					this.userToConnections.delete(userId);
					if (autoRemoveOnEmpty) {
						return this.presence.remove(userId);
					}
				}
			}
		}
	}

	addSocket = (
		key: string,
		socket: WebSocket | WSWebSocket,
		info: TokenInfo,
		options?: {
			disableAutoRemoveOnClose?: boolean;
		},
	) => {
		const connection = new WebSocketClientConnection(key, socket, info);

		this.connections.set(key, connection);
		this.addMappings(info.userId, key);

		const unsubscribes: (() => void)[] = [];
		/**
		 * Listen for websocket close and remove connection and mappings.
		 * If not disabled, also broadcast presence offline for the final
		 * connection per user.
		 *
		 * This may be disabled for environments where a closed connection
		 * doesn't necessarily indicate offline - Cloudflare is like this
		 * since it "hibernates" sockets but keeps them connected to the
		 * client side.
		 */
		unsubscribes.push(
			subscribeToSocketEvent(socket, 'close', async () => {
				this.log?.('info', `Socket closed: ${key}`);
				if (!options?.disableAutoRemoveOnClose) {
					await this.remove(key);
				}
				unsubscribes.forEach((u) => u());
			}),
		);
		unsubscribes.push(
			subscribeToSocketEvent(socket, 'messsage', () => {
				// sockets get a long keepalive for message activity
				// since they have a reliable close event
				this.presence.keepAlive(info.userId, 60 * 1000);
			}),
		);
	};

	addRequest = (
		key: string,
		request: IncomingMessage,
		response: ServerResponse,
		info: TokenInfo,
	) => {
		const connection = new RequestClientConnection(
			key,
			request,
			response,
			info,
		);

		this.connections.set(key, connection);
		this.addMappings(info.userId, key);

		return () => {
			connection.end();
			this.connections.delete(key);
		};
	};

	addFetch = (key: string, req: Request, info: TokenInfo): (() => Response) => {
		const connection = new FetchClientConnection(key, req, info);

		this.connections.set(key, connection);
		this.addMappings(info.userId, key);

		return () => {
			connection.end();
			this.connections.delete(key);
			return connection.res;
		};
	};

	remove = async (key: string) => {
		this.connections.delete(key);
		await this.removeMappings(key);
	};

	respond = (key: string, message: ServerMessage) => {
		const connection = this.connections.get(key);
		if (connection) {
			connection.respond(message);
			return true;
		} else {
			this.log?.(
				'warn',
				`Could not respond: no connection found for key: ${key}`,
			);
			return false;
		}
	};

	/**
	 * Broadcasts a message to all live-connected clients in a library.
	 * This does not reach push/pull clients.
	 */
	broadcast = (message: ServerMessage, omitKeys: string[] = []) => {
		this.log?.(
			'debug',
			`Broadcasting message to ${this.connections.size} potential clients`,
			{
				omitKeys,
				messageType: message.type,
			},
		);
		for (const [key, connection] of this.connections) {
			if (!omitKeys.includes(key)) {
				connection.respond(message);
			}
		}
	};

	disconnectAll = () => {
		for (const connection of this.connections.values()) {
			if (connection instanceof WebSocketClientConnection) {
				connection.ws.close();
			}
		}
		this.connections.clear();
	};
}
