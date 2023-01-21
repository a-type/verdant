import { pascalCase } from 'change-case';
import { getCollectionPluralName } from './collections.js';
import { clientImplementation } from './constants.js';
import { getObjectProperty } from './tools.js';

export function getClientTypings({ collections, schemaPath }) {
	const pluralNames = collections.map((collection) => ({
		plural: getCollectionPluralName(collection),
		singular: getObjectProperty(collection, 'name').value,
	}));

	return `
  import type schema from '${schemaPath}';
  import type { StorageSchema } from '@lo-fi/common';
  import type { Storage, StorageInitOptions, ObjectEntity, ListEntity, Query, ServerSync, EntityFile } from '@lo-fi/web';
  export * from '@lo-fi/web';
  export type Schema = typeof schema;

  interface Collection<Document extends ObjectEntity<any, any>, Snapshot, Init, Filter> {
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
  batch: Storage['batch'];

  close: Storage['close'];

  export: Storage['export'];
  import: Storage['import'];

  stats: () => Promise<any>;
  /**
   * Resets all local data. Use with caution. If this replica
   * is synced, it can restore from the server, but if it is not,
   * the data will be permanently lost.
   */
  __dangerous__resetLocal: Storage['__dangerous__resetLocal'];
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
