import { useEffect, useState } from 'react';

export function useIsServiceWorkerRegistered() {
	const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] =
		useState(false);

	useEffect(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then(() => {
				setIsServiceWorkerRegistered(true);
			});
		}
	}, []);

	return isServiceWorkerRegistered;
}
