import { afterAll, beforeAll } from 'vitest';
import { createTestClient } from './testClient.js';
import { startTestServer } from './testServer.js';

export function createTestContext({
	serverLog,
	keepDb,
}: { serverLog?: boolean; keepDb?: boolean } = {}) {
	const context = {
		clients: [],
	} as unknown as {
		server: UnwrapPromise<ReturnType<typeof startTestServer>>;
		clients: UnwrapPromise<ReturnType<typeof createTestClient>>[];
		createTestClient: typeof createTestClient;
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

	return context as Required<typeof context>;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
