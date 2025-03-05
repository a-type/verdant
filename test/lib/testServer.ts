import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import {
	createVerdant,
	LocalFileStorage,
	ReplicaType,
	TokenProvider,
	VerdantCore,
} from '@verdant-web/server';
import { createHonoRouter } from '@verdant-web/server/hono';
import { createNodeWebsocketHandler } from '@verdant-web/server/node';
import { sqlShardStorage, StorageOptions } from '@verdant-web/server/storage';
import getPort from 'get-port';
import { Hono } from 'hono';
import { Server } from 'http';

const SECRET = 'notsecret';

export async function startTestServer({
	log = false,
	disableRebasing = false,
	keepDb = false,
	truancyMinutes,
}: {
	log?: boolean | ((...args: any[]) => void);
	disableRebasing?: boolean;
	keepDb?: boolean;
	truancyMinutes?: number;
} = {}) {
	const port = await getPort();
	const app = new Hono();

	const { storage, databaseLocation } = shardedStorage(keepDb, {
		replicaTruancyMinutes: truancyMinutes,
	});

	const finalLog = log
		? typeof log === 'function'
			? log
			: (...args: any[]) =>
					console.log('[SERVER]', ...args.map((arg) => JSON.stringify(arg)))
		: undefined;

	const core: VerdantCore = createVerdant({
		__testMode: true,
		disableRebasing,
		storage,
		tokenSecret: SECRET,
		profiles: {
			get: async (userId: string) => {
				return { id: userId };
			},
		},
		log: finalLog,
		fileStorage: new LocalFileStorage({
			rootDirectory: './test-files',
			host: `http://127.0.0.1:${port}/files`,
			log: finalLog,
		}),
	});
	const subApp = createHonoRouter(core);
	app.route('/lofi', subApp as any);

	const tokenProvider = new TokenProvider({
		secret: SECRET,
	});

	app.get('/auth/:library', async (ctx) => {
		finalLog?.('info', 'Auth request', {
			library: ctx.req.param('library'),
			user: ctx.req.query('user'),
			type: ctx.req.query('type'),
		});
		const library = ctx.req.param('library');
		const user = (ctx.req.query('user') as string) || 'anonymous';
		const type = (ctx.req.query('type') as any) || ReplicaType.Realtime;
		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			syncEndpoint: `http://127.0.0.1:${port}/lofi`,
			type,
		});
		return ctx.json({
			accessToken: token,
		});
	});

	app.get(
		'/files/*',
		async (ctx, next) => {
			finalLog?.('info', 'Serving file', ctx.req.path);
			return next();
		},
		serveStatic({
			root: 'test-files',
			onNotFound: (path) => {
				finalLog?.('warn', 'File not found:', path);
			},
			rewriteRequestPath: (path) => path.replace('/files/', ''),
		}),
	);

	const socketHandler = createNodeWebsocketHandler(core);
	const server = await new Promise<Server>((resolve) => {
		const server = serve(
			{
				fetch: app.fetch,
				port,
			},
			() => {
				finalLog?.('info', `Test server listening on port ${port}`);
				resolve(server);
			},
		) as Server;
		server.on('upgrade', socketHandler);
	});

	server.on('error', (err) => {
		console.error('❌❌ SERVER ERROR', err);
	});

	return {
		port,
		server,
		core,
		databaseLocation,
		cleanup: async () => {
			try {
				await server.close();
			} catch (err) {
				console.error(err);
			}
		},
	};
}

function shardedStorage(keepDb: boolean, options: StorageOptions) {
	const databasesDirectory = keepDb
		? `./.databases/test-${Math.random().toString(36).slice(2, 9)}`
		: ':memory:';
	if (keepDb) console.log(`Using databases directory ${databasesDirectory}`);
	return {
		storage: sqlShardStorage({
			databasesDirectory,
			...options,
		}),
		databaseLocation: databasesDirectory,
	};
}
