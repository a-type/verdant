import { generateId } from '@verdant-web/common';
import { createMiddleware } from 'hono/factory';
import { TokenInfo, TokenVerifier } from '../../TokenVerifier.js';
import { getRequestToken } from './getRequestToken.js';

export const tokenMiddleware = (tokenVerifier: TokenVerifier) =>
	createMiddleware<{
		Variables: {
			key: string;
			tokenInfo: TokenInfo;
		};
	}>((ctx, next) => {
		if (ctx.req.method === 'OPTIONS') {
			// preflight request, np
			return next();
		}
		const requestToken = getRequestToken(ctx.req.raw)!;

		const key = generateId();
		const info = tokenVerifier.verifyToken(requestToken);
		ctx.set('key', key);
		ctx.set('tokenInfo', info);

		// if a Sec-Websocket-Protocol header was sent, we need to echo it back
		// so the websocket connection is accepted by the client
		const protocolHeader = ctx.req.header('Sec-WebSocket-Protocol');
		if (protocolHeader) {
			ctx.res.headers.set('Sec-WebSocket-Protocol', requestToken);
		}

		return next();
	});
