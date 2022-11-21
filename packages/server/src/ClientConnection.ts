import { ServerMessage } from '@lo-fi/common';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';

abstract class ClientConnection {
	constructor(readonly key: string) {}

	abstract respond(message: ServerMessage): void;
}

class RequestClientConnection extends ClientConnection {
	readonly type = 'request';

	private responses: ServerMessage[] = [];

	constructor(
		key: string,
		private readonly req: IncomingMessage,
		private readonly res: ServerResponse,
	) {
		super(key);
	}

	respond = (message: ServerMessage) => {
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

class WebSocketClientConnection extends ClientConnection {
	readonly type = 'websocket';

	constructor(key: string, private readonly ws: WebSocket) {
		super(key);
	}

	respond = (message: ServerMessage) => {
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

	addSocket = (libraryId: string, key: string, socket: WebSocket) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new WebSocketClientConnection(key, socket);

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
	) => {
		const lib = this.getLibraryConnections(libraryId);

		const connection = new RequestClientConnection(key, request, response);

		lib.set(key, connection);

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
		for (const [key, connection] of lib) {
			if (key.startsWith(userId)) {
				connection.respond(message);
			}
		}
	};
}
