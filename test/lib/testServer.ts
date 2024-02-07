import { Server, TokenProvider, ReplicaType } from '@verdant-web/server';
import express from 'express';
import { createServer } from 'http';
import * as fs from 'fs/promises';
import { LocalFileStorage } from '@verdant-web/server/src/files/FileStorage.js';
import getPort from 'get-port';

const SECRET = 'notsecret';

export async function startTestServer({
	log = false,
	disableRebasing = false,
	keepDb = false,
}: {
	log?: boolean;
	disableRebasing?: boolean;
	keepDb?: boolean;
} = {}) {
	const port = await getPort();
	const app = express();
	const httpServer = createServer(app);

	const dbFileName = `test-db-${Math.random().toString(36).slice(2, 9)}.sqlite`;
	console.log(`Using database file ${dbFileName}`);

	const server = new Server({
		disableRebasing,
		databaseFile: dbFileName,
		tokenSecret: SECRET,
		profiles: {
			get: async (userId: string) => {
				return { id: userId };
			},
		},
		httpServer,
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
		dbFileName,
		cleanup: async () => {
			try {
				await server.close();
				if (!keepDb) {
					await fs.unlink(dbFileName);
				}
			} catch (err) {
				console.error(err);
			}
		},
	};
}
