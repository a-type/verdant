import { Operation, ReplicaType, StorageSchema } from '@verdant-web/common';
import { expect, vi } from 'vitest';
// import { WebSocket } from 'ws';
import {
	ClientDescriptor,
	ClientDescriptorOptions,
	Migration,
} from '../client/index.js';

export async function createTestClient({
	server,
	library,
	user,
	nonce,
	type = ReplicaType.Realtime,
	logId,
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
}: {
	server?: { port: number };
	library: string;
	user: string;
	nonce?: string;
	type?: ReplicaType;
	logId?: string;
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
}) {
	const desc = new ClientDescriptor({
		migrations,
		namespace: `${library}_${user}__${nonce ?? 'no_nonce'}`,
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
					: errorLog(`${library}_${user}`)),
		files,
		schema,
		rebaseTimeout: 0,
		disableRebasing,
		EXPERIMENTAL_weakRefs: true,
		oldSchemas,
		environment: {
			location: {
				reload: vi.fn(() => {
					if (log || logId) {
						console.info('>>> reload called <<<');
					}
				}),
			} as any as Location,
			history: {
				pushState: (_, __, url) => {
					if (log || logId) {
						console.info('>>> pushState called <<<', url);
					}
				},
				replaceState: (_, __, url) => {
					if (log || logId) {
						console.info('>>> replaceState called <<<', url);
					}
				},
			} as History,
		},
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
	return client;
}

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
		console.trace(
			logId,
			ConsoleColors.red,
			'🔺🔺🔺 CRITICAL',
			...args,
			ConsoleColors.reset,
		);
	} else if (level === 'error') {
		console.trace(logId, ConsoleColors.red, ...args, ConsoleColors.reset);
	} else if (level === 'warn') {
		console.log(logId, ConsoleColors.yellow, ...args, ConsoleColors.reset);
	} else {
		console.log(logId, ...args);
	}
}

function errorLog(logId: string) {
	return function (level: string, ...args: any[]) {
		if (level === 'critical' || level === 'error') {
			return defaultLog(logId, level, ...args);
		}
	};
}
