import { ReactNode } from 'react';
import { ClientDescriptor } from './client';
import { createHooks } from './client/react';
import migrations from './migrations/index';

export const desc = new ClientDescriptor({
	namespace: 'todos',
	migrations,
});

export const hooks = createHooks();
export const Provider = ({ children }: { children: ReactNode }) => (
	<hooks.Provider value={desc}>{children}</hooks.Provider>
);
