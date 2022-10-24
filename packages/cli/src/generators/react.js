import { pascalCase } from 'change-case';
import { getObjectProperty } from './tools.js';

export function getReactTypings(collections) {
	return `
import type { Client, ClientDescriptor, ${collections
		.map((c) => getObjectProperty(c, 'name').value)
		.map((c) => pascalCase(c))
		.flatMap((name) => [name, `${name}Filter`])
		.join(', ')} } from './index.js';
import type { UserInfo, ObjectEntity, ListEntity } from '@lo-fi/web';

export interface GeneratedHooks {
  useStorage: () => Client;
  useSelf: () => UserInfo;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo;
  useSyncStatus: () => boolean;
	useWatch: (entity: ObjectEntity<any | ListEntity<any>) => void;
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

export const createHooks: (client: ClientDescriptor) => GeneratedHooks;
`;
}
