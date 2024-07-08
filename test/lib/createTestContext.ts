import { afterAll, beforeAll } from 'vitest';
import { createTestClient } from './testClient.js';
import { startTestServer } from './testServer.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

export function createTestContext({
	serverLog,
	keepDb,
	testLog,
	disableRebasing,
	disableSharding,
	truancyMinutes,
}: {
	serverLog?: boolean;
	keepDb?: boolean;
	testLog?: boolean;
	disableRebasing?: boolean;
	disableSharding?: boolean;
	truancyMinutes?: number;
} = {}) {
	const idbMap = new Map<string, IDBFactory>();
	const context = {
		clients: [],
		log: (...args: any[]) => {
			if (testLog) console.log('⭐⭐⭐', ...args);
		},
		filterLog:
			(prefix: string, ...matches: string[]) =>
			(...args: any[]) => {
				if (
					args.some((arg) =>
						matches.some((match) => JSON.stringify(arg)?.includes(match)),
					)
				) {
					console.log(prefix, ...args);
				}
			},
	} as unknown as {
		server: UnwrapPromise<ReturnType<typeof startTestServer>>;
		clients: UnwrapPromise<ReturnType<typeof createTestClient>>[];
		createTestClient: typeof createTestClient;
		log: (...args: any[]) => void;
		filterLog: (
			prefix: string,
			...matches: string[]
		) => (...args: any[]) => void;
	};
	beforeAll(async () => {
		context.server = await startTestServer({
			log: serverLog,
			keepDb,
			disableRebasing,
			disableSharding,
			truancyMinutes,
		});
		context.createTestClient = async (
			config: Parameters<typeof createTestClient>[0],
		) => {
			let idb = config.indexedDb ?? idbMap.get(config.user);
			if (!idb) {
				idb = new IDBFactory();
				idbMap.set(config.user, idb);
			}
			const client = await createTestClient({
				server: context.server,
				indexedDb: idb,
				...config,
			});
			context.clients.push(client);
			return client;
		};
	});
	afterAll(async () => {
		await context.server.cleanup();
		await Promise.allSettled(
			context.clients.map((client) => client.close().catch(() => {})),
		);
	}, 20 * 1000);

	(global as any).testContext = context;

	return context as Required<typeof context>;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
