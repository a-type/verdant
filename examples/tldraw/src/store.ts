import { TDUser, TDUserStatus } from '@tldraw/tldraw';
import { ClientDescriptor, createDefaultMigration } from './client/index.js';
import { createHooks } from './client/react.js';
import schema from './schema.js';

export interface Presence {
	user: TDUser;
}

let userId = localStorage.getItem('userId');
if (!userId) {
	userId = Math.random().toString(36).slice(2, 9);
	localStorage.setItem('userId', userId);
}

export const clientDescriptor = new ClientDescriptor<Presence>({
	migrations: [createDefaultMigration(schema)],
	namespace: 'tldraw',
	sync: {
		initialPresence: {
			user: {
				id: Math.random().toString(36).slice(2, 9),
				color: 'black',
				point: [0, 0],
				selectedIds: [],
				activeShapes: [],
				status: TDUserStatus.Connecting,
			} as TDUser,
		},
		defaultProfile: {},
		authEndpoint: `http://localhost:5050/auth?user=${userId}`,
		autoStart: true,
		presenceUpdateBatchTimeout: 100,
		pullInterval: 5000,
	},
	loadInitialData: async (client) => {
		await client.pages.put({
			version: 1,
			id: 'default',
		});
	},
});
clientDescriptor.open().then((client) => {
	(window as any).client = client;
});

export const hooks = createHooks<Presence>();
