export async function attemptToRegisterBackgroundSync() {
	try {
		const status = await navigator.permissions.query({
			name: 'periodic-background-sync' as any,
		});
		if (status.state === 'granted') {
			// Periodic background sync can be used.
			const registration = await navigator.serviceWorker.ready;
			if ('periodicSync' in registration) {
				try {
					await (registration.periodicSync as any).register('verdant-sync', {
						// An interval of one day.
						minInterval: 24 * 60 * 60 * 1000,
					});
				} catch (error) {
					// Periodic background sync cannot be used.
					console.warn('Failed to register background sync:', error);
				}
			}
		} else {
			// Periodic background sync cannot be used.
			console.debug('Background sync permission is not granted:', status);
		}
	} catch (error) {
		console.error('Failed to initiate background sync:', error);
	}
}
