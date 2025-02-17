import {
	LocalFileStorage,
	ReplicaType,
	Server,
	TokenProvider,
} from '@verdant-web/server';
import { sqlShardStorage, sqlStorage } from '@verdant-web/server/storage';
import express from 'express';
import getPort from 'get-port';
import { createServer } from 'http';
import * as path from 'path';

const SECRET = 'notsecret';

export async function startTestServer({
	log = false,
	disableRebasing = false,
	keepDb = false,
	disableSharding,
	importShardsFrom,
	truancyMinutes,
}: {
	log?: boolean | ((...args: any[]) => void);
	disableRebasing?: boolean;
	keepDb?: boolean;
	disableSharding?: boolean;
	importShardsFrom?: string;
	truancyMinutes?: number;
} = {}) {
	const port = await getPort();
	const app = express();
	const httpServer = createServer(app);

	const { storage, databaseLocation } = disableSharding
		? unifiedStorage(keepDb)
		: shardedStorage(keepDb, importShardsFrom);

	const finalLog = log
		? typeof log === 'function'
			? log
			: (...args: any[]) =>
					console.log('[SERVER]', ...args.map((arg) => JSON.stringify(arg)))
		: undefined;

	const server = new Server({
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
		replicaTruancyMinutes: truancyMinutes,
	});
	server.attach(httpServer, { httpPath: false });

	const tokenProvider = new TokenProvider({
		secret: SECRET,
	});

	app.get('/auth/:library', async (req, res) => {
		const library = req.params.library;
		const user = (req.query.user as string) || 'anonymous';
		const type = (req.query.type as any) || ReplicaType.Realtime;
		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			syncEndpoint: `http://127.0.0.1:${port}/lofi`,
			type,
		});
		res.json({
			accessToken: token,
		});
	});

	app.use('/lofi/files/:id', server.handleFileRequest);
	app.use('/lofi', server.handleRequest);

	app.get('/files/:library/:id/:filename', (req, res) => {
		finalLog?.(
			'info',
			'Serving file',
			`${req.params.library}/${req.params.id}/${req.params.filename}`,
		);
		res.sendFile(
			path.resolve(
				process.cwd(),
				`./test-files/${req.params.library}/${req.params.id}/${req.params.filename}`,
			),
		);
	});

	await new Promise<void>((resolve, reject) => {
		httpServer.listen(port, () => {
			console.log(`Test server listening on port ${port}`);
			resolve();
		});
	});

	server.on('error', (err) => {
		console.error('❌❌ SERVER ERROR', err);
	});

	return {
		port,
		server,
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

function unifiedStorage(keepDb: boolean) {
	const dbFileName = keepDb
		? `./.databases/test-db-${Math.random().toString(36).slice(2, 9)}.sqlite`
		: ':memory:';
	if (keepDb) console.log(`Using database file ${dbFileName}`);
	return {
		storage: sqlStorage({
			databaseFile: dbFileName,
		}),
		databaseLocation: dbFileName,
	};
}

function shardedStorage(keepDb: boolean, importShardsFrom?: string) {
	const databasesDirectory = keepDb
		? `./.databases/test-${Math.random().toString(36).slice(2, 9)}`
		: ':memory:';
	if (keepDb) console.log(`Using databases directory ${databasesDirectory}`);
	return {
		storage: sqlShardStorage({
			databasesDirectory,
			transferFromUnifiedDatabaseFile: importShardsFrom,
		}),
		databaseLocation: databasesDirectory,
	};
}
