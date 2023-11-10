export function getClientImplementation({
	schemaPath,
	commonjs,
}: {
	schemaPath: string;
	commonjs?: boolean;
}) {
	return `import schema from '${schemaPath}${commonjs ? '' : '.js'}';
import { ClientDescriptor as StorageDescriptor } from '@verdant-web/store';
export * from '@verdant-web/store';

export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    super({ ...init, schema: defaultedSchema });
  }
};
`;
}
