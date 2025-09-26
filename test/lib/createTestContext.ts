import { afterAll } from 'vitest';
import { createTestClient } from './testClient.js';
// @ts-ignore
import { Client, ClientWithCollections } from '@verdant-web/store';
import { IDBFactory } from 'fake-indexeddb';
import { testServerApi } from '../servers/testServerApi.js';

export function createTestContext({
	testLog,
	library,
}: {
	testLog?: boolean;
	library: string;
}) {
	const idbMap = new Map<string, IDBFactory>();
	const createClient = async (
		config: Omit<Parameters<typeof createTestClient>[0], 'library'>,
	) => {
		let idb = config.indexedDb ?? idbMap.get(config.user);
		if (!idb) {
			idb = new IDBFactory();
			idbMap.set(config.user, idb);
		}
		const client = await createTestClient({
			server: context.server,
			indexedDb: idb,
			library,
			...config,
		});
		// context.clients.push(client);
		return client;
	};
	const context = {
		library,
		clients: [] as Client<any, any>[],
		server: testServerApi,
		createTestClient: createClient,
		createGenericClient: async (
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
			context.clients.map((client) => client.close().catch(() => {})),
		);
		await testServerApi.evict(library);
	}, 20 * 1000);

	(global as any).testContext = context;

	return context as Required<typeof context>;
}
