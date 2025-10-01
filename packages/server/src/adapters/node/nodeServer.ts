import { serve } from '@hono/node-server';
import { Server } from 'node:http';
import { SingleNodeLibraryManager } from '../../libraries/singleNode.js';
import { createHonoRouter } from '../hono/honoRouter.js';
import { createNodeWebsocketHandler } from './nodeWebsockets.js';

export function createNodeServer(core: SingleNodeLibraryManager, port: number) {
	const app = createHonoRouter(core);
	const server = serve({ fetch: app.fetch, port }) as Server;
	const handler = createNodeWebsocketHandler(core);
	server.addListener('upgrade', handler);
	server.addListener('listening', () => {
		console.info(`🌿 Verdant Server listening on localhost:${port}`);
	});
	return server;
}
