import { pascalCase } from 'change-case';
import { reactImplementation } from './constants.js';
import { getObjectProperty } from './tools.js';

export function getReactTypings(collections) {
	return `
import { Provider } from 'react';
import type { Client, ClientDescriptor, Schema, ${collections
		.map((c) => getObjectProperty(c, 'name').value)
		.map((c) => pascalCase(c))
		.flatMap((name) => [name, `${name}Filter`])
		.join(', ')} } from './index.js';
		import type {
			UserInfo,
			ObjectEntity,
			ListEntity,
			EntityBase,
			AccessibleEntityProperty,
			DestructuredEntity,
			EntityShape,
		} from '@lo-fi/web';

export interface GeneratedHooks<Presence, Profile> {
	Provider: Provider<ClientDescriptor<Schema>>;
	/** @deprecated use useClient instead */
  useStorage: () => Client<Presence, Profile>;
	useClient: () => Client<Presence, Profile>;
  useSelf: () => UserInfo<Profile, Presence>;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo<Profile, Presence>;
  useSyncStatus: () => boolean;
	useWatch<T extends EntityBase<any> | null>(
		entity: T,
	): T extends EntityBase<any> ? DestructuredEntity<EntityShape<T>> : T;
	useWatch<
		T extends EntityBase<any> | null,
		P extends AccessibleEntityProperty<EntityShape<T>>,
	>(
		entity: T,
		props: P,
	): EntityShape<T>[P];
	useCanUndo(): boolean;
	useCanRedo(): boolean;
  ${collections
		.map((col) => {
			const name = getObjectProperty(col, 'name').value;
			const pascalName = pascalCase(name);
			const pascalPlural = pascalCase(
				getObjectProperty(col, 'pluralName')?.value || name + 's',
			);
			return `
use${pascalName}: (id: string) => ${pascalName};
useOne${pascalName}: (config: {
  index: ${pascalName}Filter;
}) => ${pascalName};
useAll${pascalPlural}: (config?: {
  index: ${pascalName}Filter;
}) => ${pascalName}[];
    `;
		})
		.join('\n')}
}

export function createHooks<Presence = any, Profile = any>(): GeneratedHooks<Presence, Profile>;
`;
}

export function getReactImplementation(schemaPath) {
	let impl = `
import { createHooks as baseCreateHooks } from '@lo-fi/react';
import schema from '${schemaPath}';

export function createHooks() {
	return baseCreateHooks(schema);
}
`;
	return impl;
}
