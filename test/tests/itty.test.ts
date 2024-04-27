import {
	LocalFileStorage,
	ReplicaType,
	Server,
	TokenProvider,
} from '@verdant-web/server';
import getPort from 'get-port';
import { Router, error, json, text } from 'itty-router';
import { createServerAdapter } from '@whatwg-node/server';
import { describe, expect, it } from 'vitest';
import { createServer } from 'http';
import { createTestClient } from '../lib/testClient.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForPeerCount,
	waitForQueryResult,
	waitForTime,
} from '../lib/waits.js';
import { createTestFile } from '../lib/createTestFile.js';
import { assert } from '@a-type/utils';
import { sqlStorage } from '@verdant-web/server/storage';

async function createIttyServer() {
	const port = await getPort();

	const router = Router();

	const tokenProvider = new TokenProvider({
		secret: 'notsecret',
	});

	const dbFileName = `test-db-${Math.random().toString(36).slice(2, 9)}.sqlite`;

	const server = new Server({
		storage: sqlStorage({
			databaseFile: dbFileName,
		}),
		tokenSecret: 'notsecret',
		profiles: {
			get: async (userId: string) => {
				return { id: userId };
			},
		},
		// log: (...args: any[]) =>
		// 	console.log(
		// 		'[SERVER]',
		// 		...args.map((arg) => JSON.stringify(arg).slice(0, 300)),
		// 	),
		fileStorage: new LocalFileStorage({
			rootDirectory: './test-files',
			host: `http://localhost:${port}/files`,
		}),
	});

	router
		.get('/', () => 'Success!')
		.get('/auth/:library', async (req) => {
			const library = req.params.library;
			const user = (req.query.user as string) || 'anonymous';
			const type = (req.query.type as any) || ReplicaType.Realtime;
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
		.all('/sync/files/:id', server.handleFileFetch)
		.all('/sync', server.handleFetch)
		.all('/files/:path', async (req) => {
			// fake the files...
			return text('test');
		})
		.all('*', () => error(404));

	const ittyServer = createServerAdapter((request) =>
		router
			.handle(request)
			.catch((reason) => {
				console.error(reason);
				return error(reason);
			})
			.then((res) => {
				if (res instanceof Response) return res;
				return json(res);
			}),
	);

	const httpServer = createServer(ittyServer);
	server.attach(httpServer, { httpPath: false });

	httpServer.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});

	return {
		port,
		server,
		httpServer,
	};
}

describe('the server', () => {
	it('can run in a whatwg node environment (itty.router)', async () => {
		FileReader.prototype.readAsDataURL = () => {
			return 'test';
		};

		const { httpServer, port } = await createIttyServer();

		const clientA = await createTestClient({
			library: 'itty',
			user: 'A',
			server: {
				port,
			},
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

		item1.set('image', createTestFile());

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
