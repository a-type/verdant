import { assert } from '@a-type/utils';
import { serve } from '@hono/node-server';
import {
	LocalFileStorage,
	ReplicaType,
	Server,
	TokenProvider,
} from '@verdant-web/server';
import { sqlStorage } from '@verdant-web/server/storage';
import getPort from 'get-port';
import { Hono } from 'hono';
import { Server as HttpServer } from 'http';
import { error, json, text } from 'itty-router';
import { describe, expect, it } from 'vitest';
import { createTestFile } from '../lib/createTestFile.js';
import { createTestClient } from '../lib/testClient.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForPeerCount,
	waitForQueryResult,
	waitForTime,
} from '../lib/waits.js';

async function createHonoServer() {
	const port = await getPort();

	const router = new Hono();

	const tokenProvider = new TokenProvider({
		secret: 'notsecret',
	});

	const server = new Server({
		storage: sqlStorage({
			databaseFile: ':memory:',
		}),
		tokenSecret: 'notsecret',
		profiles: {
			get: async (userId: string) => {
				return { id: userId };
			},
		},
		log: (...args: any[]) =>
			console.log(
				'[SERVER]',
				...args.map((arg) => JSON.stringify(arg).slice(0, 300)),
			),
		fileStorage: new LocalFileStorage({
			rootDirectory: './test-files',
			host: `http://localhost:${port}/files`,
		}),
	});

	router
		.get('/', (ctx) => ctx.text('Success!'))
		.get('/auth/:library', async ({ req }) => {
			const library = req.param('library');
			const user = (req.query('user') as string) || 'anonymous';
			const type = (req.query('type') as any) || ReplicaType.Realtime;
			const token = tokenProvider.getToken({
				libraryId: library,
				userId: user,
				syncEndpoint: `http://localhost:${port}/sync`,
				type,
			});
			return json({
				accessToken: token,
			});
		})
		.all('/sync/files/:id', async (ctx) => {
			return server.handleFileFetch(ctx.req.raw);
		})
		.all('/sync', (ctx) => server.handleFetch(ctx.req.raw))
		.all('/files/:path', async (req) => {
			// fake the files...
			return text('test');
		})
		.all('*', () => error(404));

	const httpServer = serve({ fetch: router.fetch, port }) as HttpServer;
	server.attach(httpServer, { httpPath: false });

	httpServer.addListener('listening', () => {
		console.log(`Server listening on port ${port}`);
	});

	return {
		port,
		server,
		httpServer,
	};
}

describe('the server', () => {
	it('can run in a ESM/Web server environment (Hono)', async () => {
		const { httpServer, port } = await createHonoServer();

		const clientA = await createTestClient({
			library: 'itty',
			user: 'A',
			server: {
				port,
			},
			// onLog(msg) {
			// 	if (msg.toLowerCase().includes('upload')) {
			// 		console.log('A:', msg);
			// 	}
			// },
			// logId: 'A',
		});

		const clientB = await createTestClient({
			library: 'itty',
			user: 'B',
			server: {
				port,
			},
		});

		const item1 = await clientA.items.put({ content: 'item 1', id: '1' });

		clientA.sync.start();
		clientB.sync.start();

		await waitForPeerCount(clientA, 1);

		clientA.items.put({ content: 'item 2', id: '2' });
		clientB.items.put({ content: 'item 3', id: '3' });

		item1.set('image', createTestFile('test content'));

		await waitForTime(1000);

		const item1BQuery = clientB.items.get('1');
		await waitForQueryResult(item1BQuery);
		const item1B = await item1BQuery.resolved;

		expect(item1B).toBeTruthy();
		assert(!!item1B);
		await waitForEntityCondition(item1B, () => !!item1B.get('image'));
		await waitForCondition(() => !item1B.get('image')!.loading);

		expect(item1B.get('image')!.failed).toBe(false);

		httpServer.close();
	});
});
