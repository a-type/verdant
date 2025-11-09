import { Client, ClientWithCollections } from '@verdant-web/store';
import { afterAll } from 'vitest';
import { testServerApi } from '../servers/testServerApi.js';
import { createTestClient } from './testClient.js';

export function createTestContext({
	testLog,
	library: rawLibrary,
}: {
	testLog?: boolean;
	library: string;
}) {
	const nonce = Math.random().toString(36).slice(2, 7);
	const library = `${rawLibrary}-${nonce}`;
	const createClient = (
		config: Omit<Parameters<typeof createTestClient>[0], 'library'>,
	) => {
		const client = createTestClient({
			server: context.server,
			library,
			...config,
		});
		context.clients.push(client as any);
		return client;
	};
	const context = {
		library,
		nonce,
		clients: [] as (Client | ClientWithCollections)[],
		server: testServerApi,
		createTestClient: createClient,
		createGenericClient: (
			config: Omit<Parameters<typeof createTestClient>[0], 'library'>,
		) => {
			return createClient(config) as unknown as ClientWithCollections;
		},
		log: (...args: any[]) => {
			if (testLog) console.log('🔺', ...args);
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
	};
	afterAll(async () => {
		await Promise.allSettled(
			context.clients.map(async (client) => {
				client.sync.stop();
				await client.__dangerous__resetLocal();
				client.close();
			}),
		);
		await testServerApi.evict(library);
	}, 10 * 1000);

	return context as Required<typeof context>;
}
