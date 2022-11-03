import { ReplicaType } from '@lo-fi/server';
import { ClientDescriptor } from '../client/index.js';
import migrations from '../migrations/migrations.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

export async function createTestClient({
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
}: {
	server: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
}) {
	const indexedDb = new IDBFactory();
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}`,
		indexedDb,
		sync: {
			authEndpoint: `http://localhost:${server.port}/auth/${library}?user=${user}&type=${type}`,
			initialPresence: {},
			initialTransport: 'realtime',
		},
		log: logId
			? (...args: any[]) => console.log(`[${logId}]`, ...args)
			: undefined,
	});
	const client = await desc.open();
	return client;
}
