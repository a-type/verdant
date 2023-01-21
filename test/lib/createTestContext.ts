import { afterAll, beforeAll } from 'vitest';
import { createTestClient } from './testClient.js';
import { startTestServer } from './testServer.js';

export function createTestContext() {
	const context = {
		clients: [],
	} as unknown as {
		server: UnwrapPromise<ReturnType<typeof startTestServer>>;
		clients: UnwrapPromise<ReturnType<typeof createTestClient>>[];
		createTestClient: typeof createTestClient;
	};
	context.createTestClient = async (
		...args: Parameters<typeof createTestClient>
	) => {
		const client = await createTestClient(...args);
		context.clients.push(client);
		return client;
	};
	beforeAll(async () => {
		context.server = await startTestServer({ log: false });
	});
	afterAll(async () => {
		await context.server.cleanup();
		for (const client of context.clients) {
			client.close();
		}
	}, 20 * 1000);

	return context as Required<typeof context>;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
