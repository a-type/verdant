import { pascalCase } from 'change-case';
import { getCollectionPluralName } from './collections.js';
import { clientImplementation } from './constants.js';
import { getObjectProperty } from './tools.js';

export function getClientTypings(collections) {
	const pluralNames = collections.map((collection) => ({
		plural: getCollectionPluralName(collection),
		singular: getObjectProperty(collection, 'name').value,
	}));

	return `
  interface Collection<Document extends ObjectEntity<any>, Snapshot, Init, Filter> {
    create: (init: Init) => Promise<Document>;
    upsert: (init: Init) => Promise<Document>;
    delete: (id: string) => Promise<void>;
    deleteAll: (ids: string[]) => Promise<void>;
    get: (id: string) => Query<Document>;
    findOne: (filter: Filter) => Query<Document>;
    findAll: (filter?: Filter) => Query<Document[]>;
  }

export class Client {
  ${pluralNames.map(getClientCollectionTypings).join(';\n')}

  presence: Storage['sync']['presence'];
  sync: Storage['sync'];
  undoHistory: Storage['undoHistory'];
  namespace: Storage['namespace'];

  close: Storage['close'];

  stats: () => Promise<any>;
}

export class ClientDescriptor {
  constructor(init: Omit<StorageInitOptions<Schema>, 'schema'>);
  open: () => Promise<Client>;
  readonly current: Client | null;
  readonly readyPromise: Promise<Client>;
  readonly schema: StorageSchema;
  readonly namespace: string;
}
`;
}

function getClientCollectionTypings({ singular, plural }) {
	const pascalName = pascalCase(singular);
	return `
  readonly ${plural}: Collection<${pascalName}, ${pascalName}Snapshot, ${pascalName}Init, ${pascalName}Filter>
  `;
}

export function getClientImplementation(schemaLocation) {
	let impl = `import schema from '${schemaLocation}';`;
	impl += clientImplementation;
	return impl;
}
