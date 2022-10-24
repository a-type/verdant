import { pascalCase } from 'change-case';
import { getCollectionPluralName } from './collections.js';
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
    get: (id: string) => Query<Document>;
    findOne: (filter: Filter) => Query<Document>;
    findAll: (filter?: Filter) => Query<Document[]>;
  }

export class Client {
  ${pluralNames.map(getClientCollectionTypings).join(';\n')}

  presence: Storage['presence'];

  stats: () => Promise<any>;
}

export class ClientDescriptor<Schema extends StorageSchema<any>> {
  constructor(init: StorageInitOptions<Schema>);
  open: () => Promise<Client>;
  readonly current: Client | null;
  readonly readyPromise: Promise<Client>;
  readonly schema: Schema;
}
`;
}

function getClientCollectionTypings({ singular, plural }) {
	const pascalName = pascalCase(singular);
	return `
  readonly ${plural}: Collection<${pascalName}, ${pascalName}Snapshot, ${pascalName}Init, ${pascalName}Filter>
  `;
}
