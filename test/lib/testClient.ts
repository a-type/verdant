import { ReplicaType } from '@lo-fi/server';
import {
	Client,
	ClientDescriptor,
	ClientDescriptorOptions,
	Migration,
} from '../client/index.js';
import defaultMigrations from '../migrations/migrations.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

export async function createTestClient({
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	indexedDb = new IDBFactory(),
	migrations = defaultMigrations,
	files,
}: {
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	indexedDb?: IDBFactory;
	migrations?: Migration<any>[];
	files?: ClientDescriptorOptions['files'];
}) {
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}`,
		indexedDb,
		sync: server
			? {
					authEndpoint: `http://localhost:${server.port}/auth/${library}?user=${user}&type=${type}`,
					initialPresence: {},
					defaultProfile: {},
					initialTransport: 'realtime',
					// don't allow clients to downgrade to polling!
					// polling sucks for testing lol
					automaticTransportSelection: false,
			  }
			: undefined,
		log: logId
			? (...args: any[]) => console.log(`[${logId}]`, ...args)
			: undefined,
		files,
	});
	const client = await desc.open();
	return client;
}
