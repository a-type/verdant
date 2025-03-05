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
		const requestToken = getRequestToken(ctx.req.raw);

		const key = generateId();
		const info = tokenVerifier.verifyToken(requestToken);
		ctx.set('key', key);
		ctx.set('tokenInfo', info);

		return next();
	});
