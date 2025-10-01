import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import {
	createVerdant,
	LocalFileStorage,
	ReplicaType,
	TokenProvider,
} from '@verdant-web/server';
import { createHonoRouter } from '@verdant-web/server/hono';
import { createNodeWebsocketHandler } from '@verdant-web/server/node';
import { sqlShardStorage } from '@verdant-web/server/storage';
import getPort from 'get-port';
import { Hono } from 'hono';
import { rm } from 'node:fs';
import { resolve } from 'node:path';

if (!process.send) {
	throw new Error(
		'This server must be started as a child process (IPC not found)',
	);
}

const SECRET = 'notsecret';
const keepDb = false;

const port = await getPort();
const app = new Hono();

const { storage, databaseLocation } = shardedStorage(keepDb);

const forwardLogsToIpc = (...args) => {
	console.debug(...args);
	if (process.send) {
		process.send(
			JSON.stringify({
				type: 'log',
				args,
			}),
		);
	}
};

const fileDir = resolve(process.cwd(), 'test-files');

/** @type {import('@verdant-web/server').VerdantCore} */
const core = createVerdant({
	__testMode: true,
	storage,
	tokenSecret: SECRET,
	profiles: {
		get: async (userId) => {
			return { id: userId };
		},
	},
	log: forwardLogsToIpc,
	fileStorage: new LocalFileStorage({
		rootDirectory: fileDir,
		host: `http://127.0.0.1:${port}/files`,
		log: forwardLogsToIpc,
	}),
});
const subApp = createHonoRouter(core);
app.use(async (c, next) => {
	forwardLogsToIpc('➡️ ', c.req.method, c.req.path);
	await next();
	forwardLogsToIpc('⬅️ ', c.res.status);
});
app.route('/lofi', subApp);

const tokenProvider = new TokenProvider({
	secret: SECRET,
});

app.get('/auth/:library', async (ctx) => {
	const library = ctx.req.param('library');
	const user = ctx.req.query('user') || 'anonymous';
	const type = ctx.req.query('type') || ReplicaType.Realtime;
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
		forwardLogsToIpc('📁', 'File request', ctx.req.path);
		return next();
	},
	serveStatic({
		root: fileDir,
		onNotFound: (path) => {
			forwardLogsToIpc('🚫', 'File not found:', path);
		},
		rewriteRequestPath: (path) => path.replace('/files/', ''),
	}),
);

app.get('/libraries/:libraryId/documents/:collection/:id', async (ctx) => {
	const { libraryId, collection, id } = ctx.req.param();
	const library = await core.get(libraryId);
	if (!library) {
		return ctx.json({ error: 'Library not found' }, 404);
	}
	const doc = await library.getDocumentSnapshot(collection, id);
	if (!doc) {
		return ctx.json({ error: 'Document not found' }, 404);
	}
	return ctx.json(doc);
});

app.get('/libraries/:libraryId/files/:file', async (ctx) => {
	const { libraryId, file } = ctx.req.param();
	const library = await core.get(libraryId);
	if (!library) {
		return ctx.json({ error: 'Library not found' }, 404);
	}
	const info = await library.getFileInfo(file);
	if (!info) {
		return ctx.json({ error: 'File not found' }, 404);
	}
	return ctx.json({
		id: info.id,
		fileName: info.name,
		libraryId,
		type: info.type,
		url: info.url,
	});
});

app.post('/libraries/:libraryId/evict', async (ctx) => {
	const { libraryId } = ctx.req.param();
	await core.evict(libraryId);
	return ctx.json({ success: true });
});

app.get('/libraries/:libraryId', async (ctx) => {
	const { libraryId } = ctx.req.param();
	const library = await core.get(libraryId);
	if (!library) {
		return ctx.json({ error: 'Library not found' }, 404);
	}
	const info = await library.getInfo();
	if (!info) {
		return ctx.json({ error: 'Library info not found' }, 404);
	}
	return ctx.json(info);
});

app.post(
	'/libraries/:libraryId/replicas/:replicaId/force-truant',
	async (ctx) => {
		const { libraryId, replicaId } = ctx.req.param();
		const library = await core.get(libraryId);
		if (!library) {
			return ctx.json({ error: 'Library not found' }, 404);
		}
		await library.forceTruant(replicaId);
		return ctx.json({ success: true });
	},
);

const socketHandler = createNodeWebsocketHandler(core);
const server = await new Promise((resolve) => {
	const server = serve(
		{
			fetch: app.fetch,
			port,
		},
		() => {
			resolve(server);
		},
	);
	server.on('upgrade', socketHandler);
});

server.on('error', (err) => {
	console.error('❌❌ SERVER ERROR', err);
});

if (process.send) {
	console.log('Test server started on port', port);
	process.send(
		JSON.stringify({
			type: 'ready',
			databaseLocation,
			port,
		}),
	);
}

process.on('beforeExit', () => {
	rm(fileDir, { recursive: true, force: true });
});

function shardedStorage(keepDb) {
	const databasesDirectory = keepDb
		? `./.databases/test-${Math.random().toString(36).slice(2, 9)}`
		: ':memory:';
	if (keepDb) console.log(`Using databases directory ${databasesDirectory}`);
	return {
		storage: sqlShardStorage({
			databasesDirectory,
			replicaTruancyMinutes: 10,
		}),
		databaseLocation: databasesDirectory,
	};
}
