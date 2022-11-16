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

export interface GeneratedHooks {
	Provider: Provider<ClientDescriptor<Schema>>;
  useStorage: () => Client;
  useSelf: () => UserInfo;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo;
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

export const hooks: GeneratedHooks;
`;
}

export function getReactImplementation(schemaPath) {
	let impl = `
import { createHooks } from '@lo-fi/react';
import schema from '${schemaPath}';

export const hooks = createHooks(schema);
`;
	return impl;
}
