import { Server, TokenProvider, ReplicaType } from '@verdant-web/server';
import express from 'express';
import { createServer } from 'http';
import * as fs from 'fs/promises';
import { LocalFileStorage } from '@verdant-web/server';
import { sqlShardStorage, sqlStorage } from '@verdant-web/server/storage';
import getPort from 'get-port';

const SECRET = 'notsecret';

export async function startTestServer({
	log = false,
	disableRebasing = false,
	keepDb = false,
	disableSharding,
}: {
	log?: boolean;
	disableRebasing?: boolean;
	keepDb?: boolean;
	disableSharding?: boolean;
} = {}) {
	const port = await getPort();
	const app = express();
	const httpServer = createServer(app);

	const storage = disableSharding
		? unifiedStorage(keepDb)
		: shardedStorage(keepDb);

	const server = new Server({
		disableRebasing,
		storage,
		tokenSecret: SECRET,
		profiles: {
			get: async (userId: string) => {
				return { id: userId };
			},
		},
		log: log
			? (...args: any[]) =>
					console.log(
						'[SERVER]',
						...args.map((arg) => JSON.stringify(arg).slice(0, 300)),
					)
			: undefined,
		fileStorage: new LocalFileStorage({
			rootDirectory: './test-files',
			host: `http://localhost:${port}/files`,
		}),
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
			syncEndpoint: `http://localhost:${port}/lofi`,
			type,
		});
		res.json({
			accessToken: token,
		});
	});

	app.use('/lofi/files/:id', server.handleFileRequest);
	app.use('/lofi', server.handleRequest);

	app.use('/files', express.static('./test-files'));

	await new Promise<void>((resolve, reject) => {
		httpServer.listen(port, () => {
			console.log(`Test server listening on port ${port}`);
			resolve();
		});
	});

	server.on('error', (err) => {
		console.error(err);
	});

	return {
		port,
		server,
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
	return sqlStorage({
		databaseFile: dbFileName,
	});
}

function shardedStorage(keepDb: boolean) {
	const databasesDirectory = keepDb
		? `./.databases/test-${Math.random().toString(36).slice(2, 9)}`
		: ':memory:';
	if (keepDb) console.log(`Using databases directory ${databasesDirectory}`);
	return sqlShardStorage({
		databasesDirectory,
		transferFromUnifiedDatabaseFile: keepDb ? undefined : ':memory:',
	});
}
