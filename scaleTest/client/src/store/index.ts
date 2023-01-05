import cuid from 'cuid';
import { ClientDescriptor } from './client/index.js';
import migrations from './migrations/index.js';

export * from './client/index.js';

export function createClient(apiHost: string, library: string) {
	const storeDesc = new ClientDescriptor({
		migrations,
		// each client gets a new, random namespace, so storage won't collide
		// across tabs
		namespace: `${library}-${cuid()}`,
		sync: {
			defaultProfile: {},
			initialPresence: { emoji: '' },
			authEndpoint: `${apiHost}/auth/${library}?user=${cuid.slug()}}`,
			autoStart: true,
			initialTransport: 'realtime',
			automaticTransportSelection: false,
		},
	});

	return storeDesc.open();
}
