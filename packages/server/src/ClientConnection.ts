import { ServerMessage } from '@lo-fi/common';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';
import { TokenInfo } from './TokenVerifier.js';

abstract class ClientConnection {
	constructor(readonly key: string, readonly info: TokenInfo) {}

	abstract respond(...messages: ServerMessage[]): void;
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

	respond = (...messages: ServerMessage[]) => {
		this.responses.push(...messages);
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

class WebSocketClientConnection extends ClientConnection {
	readonly type = 'websocket';

	constructor(key: string, readonly ws: WebSocket, info: TokenInfo) {
		super(key, info);
	}

	respond = (...messages: ServerMessage[]) => {
		for (const message of messages) {
			this.ws.send(JSON.stringify(message));
		}
	};
}

export class ClientConnectionManager {
	private readonly connections: Record<string, Map<string, ClientConnection>> =
		{};

	private readonly userQueues: Record<string, ServerMessage[]> = {};
	private readonly userQueueLimit = 100;

	private getLibraryConnections = (libraryId: string) => {
		if (!this.connections[libraryId]) {
			this.connections[libraryId] = new Map();
		}
		return this.connections[libraryId]!;
	};

	private addConnection = (
		lib: Map<string, ClientConnection>,
		key: string,
		connection: ClientConnection,
	) => {
		// if there's a buffer of outgoing messages for this user,
		// supply it
		if (this.userQueues[connection.info.userId]) {
			connection.respond(...this.userQueues[connection.info.userId]);
			delete this.userQueues[connection.info.userId];
		}

		lib.set(key, connection);
	};

	addSocket = (
		libraryId: string,
		key: string,
		socket: WebSocket,
		info: TokenInfo,
	) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new WebSocketClientConnection(key, socket, info);

		this.addConnection(lib, key, connection);

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

		this.addConnection(lib, key, connection);

		return () => {
			connection.end();
			lib.delete(key);
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

	sendToUser = (libraryId: string, userId: string, message: ServerMessage) => {
		const lib = this.getLibraryConnections(libraryId);
		let delivered = false;
		for (const [key, connection] of lib) {
			if (connection.info.userId === userId) {
				connection.respond(message);
				delivered = true;
			}
		}
		// sending to one user attempts to guarantee delivery to at least one
		// of their devices. if we didn't deliver, we'll enqueue the message
		if (this.isEnqueueable(message) && !delivered) {
			if (!this.userQueues[userId]) {
				this.userQueues[userId] = [];
			}
			this.userQueues[userId].push(message);
			if (this.userQueues[userId].length > this.userQueueLimit) {
				this.userQueues[userId].shift();
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

	private isEnqueueable = (message: ServerMessage) => {
		// for now only messages are enqueued. other stuff
		// is all handled by sync.
		return message.type === 'message-received';
	};
}
