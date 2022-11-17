import { ReplicaType } from '@lo-fi/server';
import { Client, ClientDescriptor } from '../client/index.js';
import migrations from '../migrations/migrations.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

export async function createTestClient({
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	loadInitialData,
	indexedDb = new IDBFactory(),
}: {
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	loadInitialData?: (client: Client) => Promise<void>;
	indexedDb?: IDBFactory;
}) {
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}`,
		indexedDb,
		sync: server
			? {
					authEndpoint: `http://localhost:${server.port}/auth/${library}?user=${user}&type=${type}`,
					initialPresence: {},
					initialTransport: 'realtime',
			  }
			: undefined,
		log: logId
			? (...args: any[]) => console.log(`[${logId}]`, ...args)
			: undefined,
		loadInitialData,
	});
	const client = await desc.open();
	return client;
}
