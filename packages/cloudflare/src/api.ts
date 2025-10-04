import {
	errorHandler,
	tokenMiddleware,
	TokenVerifier,
} from '@verdant-web/server/internals';
import { Hono } from 'hono';
import { routePath } from 'hono/route';

export interface VerdantWorkerConfig {
	durableObjectBindingName: string;
	tokenSecretBindingName: string;
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
	// this really just determines which library DO to route to
	// and the DO handles the rest
	const app = new Hono<{ Bindings: any; Variables: any }>()
		.onError(errorHandler)
		.use((ctx, next) => {
			const tokenVerifier = new TokenVerifier({
				secret: ctx.env[config.tokenSecretBindingName],
			});
			return tokenMiddleware(tokenVerifier)(ctx as any, next);
		})
		.all((ctx) => {
			if (ctx.req.method === 'OPTIONS') {
				// preflight request, np
				return ctx.newResponse(null, { status: 204 });
			}

			const info = ctx.get('tokenInfo');
			const id = ctx.env[config.durableObjectBindingName].idFromName(
				info.libraryId,
			);
			const obj = ctx.env[config.durableObjectBindingName].get(id);
			// remove the base path so the DO sees the correct routing
			const path = routePath(ctx);
			const thisUrl = new URL(ctx.req.url);
			thisUrl.pathname = thisUrl.pathname.replace(path, '') || '/';
			const modifiedReq: Request = new Request(thisUrl.toString(), ctx.req.raw);
			console.log(
				`[verdant worker] routing to DO ${info.libraryId}:`,
				ctx.req.method,
				ctx.req.url,
				path,
				modifiedReq.url,
			);
			return obj.fetch(modifiedReq);
		});

	return app;
}
