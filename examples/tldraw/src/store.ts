import { TDUser, TDUserStatus } from '@tldraw/tldraw';
import { ClientDescriptor, createDefaultMigration } from './client/index.js';
import { createHooks } from './client/react.js';
import migrations from './migrations/index.js';

export interface Presence {
	user: TDUser;
}

let userId = localStorage.getItem('userId');
if (!userId) {
	userId = Math.random().toString(36).slice(2, 9);
	localStorage.setItem('userId', userId);
}

export const clientDescriptor = new ClientDescriptor<Presence>({
	migrations,
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
	files: {
		// immediately delete deleted files from storage. this is not a good idea.
		canCleanupDeletedFile: (file) => true,
	},
	log: console.debug,
	EXPERIMENTAL_weakRefs: true,
});
clientDescriptor.open().then((client) => {
	(window as any).client = client;
});

export const hooks = createHooks<Presence>();

export type Client = ReturnType<typeof hooks.useClient>;
