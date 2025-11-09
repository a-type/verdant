import type { Client } from '../client/Client.js';

export async function registerBackgroundSync(client: Client) {
	self.addEventListener('periodicsync', (event: any) => {
		if (event.tag === 'verdant-sync') {
			// See the "Think before you sync" section for
			// checks you could perform before syncing.
			event.waitUntil(sync(client));
		}
	});
}

async function sync(client: Client) {
	try {
		await client.sync.syncOnce();
	} catch (err) {
		console.error('Failed to sync:', err);
		if (err instanceof Error) {
			localStorage.setItem(
				'backgroundSyncError',
				`${err.name}: ${err.message}`,
			);
		}
	}
}
