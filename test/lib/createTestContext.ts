import { afterAll, beforeAll } from 'vitest';
import { createTestClient } from './testClient.js';
import { startTestServer } from './testServer.js';

export function createTestContext({
	serverLog,
	keepDb,
	testLog,
}: { serverLog?: boolean; keepDb?: boolean; testLog?: boolean } = {}) {
	const context = {
		clients: [],
		log: (...args: any[]) => {
			if (testLog) console.log('⭐⭐⭐', ...args);
		},
	} as unknown as {
		server: UnwrapPromise<ReturnType<typeof startTestServer>>;
		clients: UnwrapPromise<ReturnType<typeof createTestClient>>[];
		createTestClient: typeof createTestClient;
		log: (...args: any[]) => void;
	};
	beforeAll(async () => {
		context.server = await startTestServer({ log: serverLog, keepDb });
		context.createTestClient = async (
			config: Parameters<typeof createTestClient>[0],
		) => {
			const client = await createTestClient({
				server: context.server,
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
