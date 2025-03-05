import { authz, ClientMessage, ServerMessage } from '@verdant-web/common';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';
import { UserProfileLoader } from '../Profiles.js';
import { TokenInfo } from '../TokenVerifier.js';
import { MessageSender } from './MessageSender.js';
import { Presence } from './Presence.js';

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

class WebSocketClientConnection extends ClientConnection {
	readonly type = 'websocket';
	// detected from messages
	replicaId: string | null = null;

	constructor(
		key: string,
		readonly ws: WebSocket,
		info: TokenInfo,
	) {
		super(key, info);
		// maybe brittle... detect associated replica ID from messages
		// by wiretapping. this is used to update presence when
		// the socket is disconnected.
		ws.on('message', (message: any) => {
			const data = JSON.parse(message.toString()) as ClientMessage;
			if (data?.replicaId) {
				this.replicaId = data.replicaId;
			}
		});
	}

	handleMessage = (message: ServerMessage) => {
		this.ws.send(JSON.stringify(message));
	};
}

export class ClientConnectionManager implements MessageSender {
	private readonly connections: Map<string, ClientConnection> = new Map();
	readonly presence: Presence;

	constructor({ profiles }: { profiles: UserProfileLoader<any> }) {
		this.presence = new Presence(profiles);
	}

	addSocket = (key: string, socket: WebSocket, info: TokenInfo) => {
		const connection = new WebSocketClientConnection(key, socket, info);

		this.connections.set(key, connection);

		socket.on('close', () => {
			this.connections.delete(key);
			if (connection.replicaId) {
				this.presence.removeReplica(connection.replicaId);
			}
		});
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

		return () => {
			connection.end();
			this.connections.delete(key);
		};
	};

	addFetch = (key: string, req: Request, info: TokenInfo): (() => Response) => {
		const connection = new FetchClientConnection(key, req, info);

		this.connections.set(key, connection);

		return () => {
			connection.end();
			this.connections.delete(key);
			return connection.res;
		};
	};

	remove = (key: string) => {
		this.connections.delete(key);
	};

	respond = (key: string, message: ServerMessage) => {
		const connection = this.connections.get(key);
		if (connection) {
			connection.respond(message);
		} else {
			throw new Error(`No connection found for key ${key}`);
		}
	};

	/**
	 * Broadcasts a message to all live-connected clients in a library.
	 * This does not reach push/pull clients.
	 */
	broadcast = (message: ServerMessage, omitKeys: string[] = []) => {
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
