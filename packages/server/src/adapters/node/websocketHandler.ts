import {
	ClientMessage,
	VerdantError,
	assert,
	generateId,
} from '@verdant-web/common';
import { IncomingMessage } from 'node:http';
import internal from 'node:stream';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { TokenInfo } from '../../TokenVerifier.js';
import { SingleNodeLibraryManager } from '../../libraries/singleNode.js';

export function createNodeWebsocketHandler(core: SingleNodeLibraryManager) {
	const wss = new WebSocketServer({ noServer: true });
	wss.on(
		'connection',
		async (ws: WebSocket, req: IncomingMessage, info: TokenInfo) => {
			const key = generateId();

			const microserver = await core.get(info.libraryId);

			microserver.clientConnections.addSocket(key, ws, info);

			ws.on('message', async (message: any) => {
				const data = JSON.parse(message.toString()) as ClientMessage;
				await microserver.handleMessage(key, info, data);
			});

			ws.on('close', () => {
				microserver.clientConnections.remove(key);
				core.log('debug', 'Connection closed', { key, userId: info.userId });
			});
		},
	);

	function getRequestToken(req: IncomingMessage) {
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
		if (!token) {
			throw new VerdantError(
				VerdantError.Code.NoToken,
				undefined,
				'Token query parameter is required',
			);
		}

		return token;
	}

	return (req: IncomingMessage, socket: internal.Duplex, head: Buffer) => {
		try {
			const token = getRequestToken(req);
			const info = core.tokenVerifier.verifyToken(token);
			wss.handleUpgrade(req, socket, head, (ws) => {
				wss.emit('connection', ws, req, info);
			});
		} catch (err) {
			if (err instanceof VerdantError && err.httpStatus === 401) {
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
}
