import { pascalCase } from 'change-case';

export function getClientTypings(collectionNames) {
	return `
  interface Collection<Document, Snapshot, Init, Filter> {
    create: (init: Init) => Promise<Document>;
    upsert: (init: Init) => Promise<Document>;
    delete: (id: string) => Promise<void>;
    get: (id: string) => Query<Document>;
    findOne: (filter: Filter) => Query<Document>;
    findAll: (filter: Filter) => Query<Document[]>;
  }

export class Client {
  ${collectionNames.map(getClientCollectionTypings).join(';\n')}

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

function getClientCollectionTypings(collectionName) {
	const pascalName = pascalCase(collectionName);
	return `
  readonly ${collectionName}: Collection<${pascalName}, ${pascalName}Snapshot, ${pascalName}Init, ${pascalName}Filter>
  `;
}
