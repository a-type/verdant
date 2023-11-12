import { ReplicaType } from '@verdant-web/server';
import {
	ClientDescriptor,
	ClientDescriptorOptions,
	Migration,
} from '../client/index.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

export async function createTestClient({
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	indexedDb = new IDBFactory(),
	migrations,
	files,
	transport = 'realtime',
	onLog,
	schema,
	autoTransport = false,
	log,
}: {
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	indexedDb?: IDBFactory;
	migrations?: Migration<any>[];
	files?: ClientDescriptorOptions['files'];
	transport?: 'realtime' | 'pull';
	onLog?: (messages: string) => void;
	log?: (...args: any[]) => void;
	schema?: any;
	autoTransport?: boolean;
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
					initialTransport: transport,
					// don't allow clients to downgrade to polling!
					// polling sucks for testing lol
					automaticTransportSelection: autoTransport,
					pullInterval: 300,
			  }
			: undefined,
		log:
			log ||
			(logId
				? (...args: any[]) => {
						console.log(`[${logId}]`, ...args);
						onLog?.(args.map((a) => JSON.stringify(a)).join('\n'));
				  }
				: onLog
				? (...args: any[]) =>
						onLog(args.map((a) => JSON.stringify(a)).join('\n'))
				: undefined),
		files,
		schema,
	});
	const client = await desc.open();
	return client;
}
