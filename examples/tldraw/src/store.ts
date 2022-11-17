import { TDUser, TDUserStatus } from '@tldraw/tldraw';
import { ClientDescriptor, createDefaultMigration } from './client/index.js';
import schema from './schema.js';

declare module '@lo-fi/web' {
	export interface Presence {
		user: TDUser;
	}
}

export const clientDescriptor = new ClientDescriptor({
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
		authEndpoint: 'http://localhost:5050/auth',
		autoStart: true,
	},
	loadInitialData: async (client) => {
		await client.pages.put({
			version: 1,
			id: 'default',
		});
	},
});
clientDescriptor.open();

export { hooks } from './client/react.js';
