import type { ClientDescriptor } from '../client/ClientDescriptor.js';

export async function registerBackgroundSync(clientDesc: ClientDescriptor) {
	self.addEventListener('periodicsync', (event: any) => {
		if (event.tag === 'verdant-sync') {
			// See the "Think before you sync" section for
			// checks you could perform before syncing.
			event.waitUntil(sync(clientDesc));
		}
	});
}

async function sync(clientDesc: ClientDescriptor) {
	try {
		const client = await clientDesc.open();

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
