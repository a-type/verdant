import { Operation, StorageSchema } from '@verdant-web/common';
import { ReplicaType } from '@verdant-web/server';
import { afterAll, expect } from 'vitest';
import { WebSocket } from 'ws';
import {
	Client,
	ClientDescriptor,
	ClientDescriptorOptions,
	ClientWithCollections,
	Migration,
	PersistenceImplementation,
} from '../client/index.js';
import { getPersistence } from './persistence.js';

const cleanupClients: Client<any, any>[] = [];

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
	disableRebasing,
	persistence,
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
	disableRebasing?: boolean;
	persistence?: PersistenceImplementation;
}) {
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}`,
		persistence: persistence || getPersistence(),
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
						defaultLog(`[${logId}]`, level, ...args);
						onLog?.(args.map((a) => JSON.stringify(a)).join('\n'));
					}
				: onLog
					? (...args: any[]) =>
							onLog(args.map((a) => JSON.stringify(a)).join('\n'))
					: undefined),
		files,
		schema,
		rebaseTimeout: 0,
		disableRebasing,
		EXPERIMENTAL_weakRefs: true,
		environment: {
			fetch,
			WebSocket: WebSocket as any,
			indexedDB: indexedDb,
		},
		oldSchemas,
	});
	const client = await desc.open();
	if (onOperation) {
		client.subscribe('operation', onOperation);
	}
	client.subscribe('developerError', (err) => {
		console.error(
			ConsoleColors.red,
			`Developer Error (client: ${library}_${user})`,
		);
		console.error(ConsoleColors.red, err);
		console.error(
			ConsoleColors.red,
			'>>> cause >>>',
			err.cause,
			ConsoleColors.reset,
		);
		expect(err).toBe(null);
	});
	cleanupClients.push(client);
	return client as any as ClientWithCollections;
}

afterAll(async () => {
	for (const client of cleanupClients) {
		await client.close();
	}
});

enum ConsoleColors {
	red = '\x1b[31m',
	green = '\x1b[32m',
	yellow = '\x1b[33m',
	blue = '\x1b[34m',
	magenta = '\x1b[35m',
	cyan = '\x1b[36m',
	white = '\x1b[37m',
	reset = '\x1b[0m',
}
function defaultLog(logId: string, level: string, ...args: any[]) {
	if (level === 'critical') {
		console.log(
			logId,
			ConsoleColors.red,
			'🔺🔺🔺 CRITICAL',
			...args,
			ConsoleColors.reset,
		);
	} else if (level === 'error') {
		console.log(logId, ConsoleColors.red, ...args, ConsoleColors.reset);
	} else if (level === 'warn') {
		console.log(logId, ConsoleColors.yellow, ...args, ConsoleColors.reset);
	} else {
		console.log(logId, ...args);
	}
}
