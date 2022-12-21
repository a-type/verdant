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
    /**
     * @deprecated use put
     */
    create: (init: Init) => Promise<Document>;
    put: (init: Init) => Promise<Document>;
    delete: (id: string) => Promise<void>;
    deleteAll: (ids: string[]) => Promise<void>;
    get: (id: string) => Query<Document>;
    findOne: (filter: Filter) => Query<Document>;
    findAll: (filter?: Filter) => Query<Document[]>;
  }

export class Client<Presence = any, Profile = any> {
  ${pluralNames.map(getClientCollectionTypings).join(';\n')}

  sync: ServerSync<Profile, Presence>;
  undoHistory: Storage['undoHistory'];
  namespace: Storage['namespace'];
  entities: Storage['entities'];
  queryStore: Storage['queryStore'];

  close: Storage['close'];

  export: Storage['export'];
  import: Storage['import'];

  stats: () => Promise<any>;
}

// schema is provided internally. loadInitialData must be revised to pass the typed Client
interface ClientInitOptions<Presence = any, Profile = any> extends Omit<StorageInitOptions<Presence, Profile>, 'schema'> {
}

export class ClientDescriptor<Presence = any, Profile = any> {
  constructor(init: ClientInitOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
  close: () => Promise<void>;
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
