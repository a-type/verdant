import { authz, Operation, ServerMessage } from '@verdant-web/common';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';
import { TokenInfo } from './TokenVerifier.js';

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

	constructor(
		key: string,
		readonly ws: WebSocket,
		info: TokenInfo,
	) {
		super(key, info);
	}

	handleMessage = (message: ServerMessage) => {
		this.ws.send(JSON.stringify(message));
	};
}

export class ClientConnectionManager {
	private readonly connections: Record<string, Map<string, ClientConnection>> =
		{};

	private getLibraryConnections = (libraryId: string) => {
		if (!this.connections[libraryId]) {
			this.connections[libraryId] = new Map();
		}
		return this.connections[libraryId]!;
	};

	addSocket = (
		libraryId: string,
		key: string,
		socket: WebSocket,
		info: TokenInfo,
	) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new WebSocketClientConnection(key, socket, info);

		lib.set(key, connection);

		socket.on('close', () => {
			lib.delete(key);
		});
	};

	addRequest = (
		libraryId: string,
		key: string,
		request: IncomingMessage,
		response: ServerResponse,
		info: TokenInfo,
	) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new RequestClientConnection(
			key,
			request,
			response,
			info,
		);

		lib.set(key, connection);

		return () => {
			connection.end();
			lib.delete(key);
		};
	};

	addFetch = (
		libraryId: string,
		key: string,
		req: Request,
		info: TokenInfo,
	): (() => Response) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new FetchClientConnection(key, req, info);

		lib.set(key, connection);

		return () => {
			connection.end();
			lib.delete(key);
			return connection.res;
		};
	};

	remove = (libraryId: string, key: string) => {
		const lib = this.getLibraryConnections(libraryId);
		lib.delete(key);
	};

	respond = (libraryId: string, key: string, message: ServerMessage) => {
		const lib = this.getLibraryConnections(libraryId);
		const connection = lib.get(key);
		if (connection) {
			connection.respond(message);
		} else {
			throw new Error(
				`No connection found for library ${libraryId}, key ${key}`,
			);
		}
	};

	/**
	 * Broadcasts a message to all live-connected clients in a library.
	 * This does not reach push/pull clients.
	 */
	broadcast = (
		libraryId: string,
		message: ServerMessage,
		omitKeys: string[] = [],
	) => {
		const lib = this.getLibraryConnections(libraryId);
		for (const [key, connection] of lib) {
			if (!omitKeys.includes(key)) {
				connection.respond(message);
			}
		}
	};

	disconnectAll = (libraryId: string) => {
		const lib = this.getLibraryConnections(libraryId);
		for (const connection of lib.values()) {
			if (connection instanceof WebSocketClientConnection) {
				connection.ws.close();
			}
		}
		lib.clear();
	};
}
