import { ReplicaType } from '@verdant-web/server';
import {
	ClientDescriptor,
	ClientDescriptorOptions,
	Migration,
} from '../client/index.js';
import { Operation, StorageSchema } from '@verdant-web/common';
import { expect } from 'vitest';
// import { IDBFactory } from 'fake-indexeddb';

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
	onOperation,
	oldSchemas,
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
	onOperation?: (operation: Operation) => void;
	oldSchemas?: StorageSchema[];
}) {
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}`,
		indexedDb,
		sync: server
			? {
					authEndpoint: `http://localhost:${server.port}/auth/${library}?user=${user}&type=${type}`,
					initialPresence: {} as any,
					defaultProfile: {} as any,
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
				? (level, ...args: any[]) => {
						console.log(
							`[${logId}]`,
							level === 'critical' ? '🔺🔺🔺 CRITICAL' : level,
							...args,
						);
						onLog?.(args.map((a) => JSON.stringify(a)).join('\n'));
				  }
				: onLog
				? (...args: any[]) =>
						onLog(args.map((a) => JSON.stringify(a)).join('\n'))
				: undefined),
		files,
		schema,
		EXPERIMENTAL_weakRefs: true,
	});
	const client = await desc.open();
	if (onOperation) {
		client.subscribe('operation', onOperation);
	}
	client.subscribe('developerError', (err) => {
		console.error(err);
		console.error('>>> cause >>>', err.cause);
		expect(err).toBe(null);
	});
	return client;
}
