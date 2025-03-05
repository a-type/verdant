import { tokenMiddleware, TokenVerifier } from '@verdant-web/server/internals';
import { Hono } from 'hono';
import { globalContext } from './globals.js';

export interface VerdantWorkerConfig {
	durableObjectBindingName: string;
}

/**
 * Creates a Hono app configured to serve Verdant library traffic.
 * This app 'router' should be mounted onto another Verdant app
 * used by your main Cloudflare worker, either as a Hono router
 * or by just calling app.fetch with the request.
 * The Durable Object binding specified by `durableObjectBindingName`
 * must be configured to point to the DurableObjectNamespace for
 * the Verdant library Durable Object class as configured in your
 * wrangler config.
 */
export function createVerdantWorkerApp(config: VerdantWorkerConfig) {
	const tokenVerifier = new TokenVerifier({
		secret: globalContext.tokenSecret,
	});

	// this really just determines which library DO to route to
	// and the DO handles the rest
	return new Hono<{ Bindings: any }>()
		.use(tokenMiddleware(tokenVerifier))
		.all((ctx) => {
			const info = ctx.get('tokenInfo');
			const id = ctx.env[config.durableObjectBindingName].idFromName(
				info.libraryId,
			);
			const obj = ctx.env[config.durableObjectBindingName].get(id);
			return obj.fetch(ctx.req.raw);
		});
}
