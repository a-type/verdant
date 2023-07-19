export const clientImplementation = `
import { Storage, StorageDescriptor } from '@verdant-web/store';
export * from '@verdant-web/store';

export const Client = Storage;
export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    super({ ...init, schema: defaultedSchema });
  }
};
`;

export const clientPackage = `
{
  "name": "verdant-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "typings": "./index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js",
    },
    "./react": {
      "types": "./react.d.ts",
      "import": "./react.js",
    }
  }
}
`;

export const reactImplementation = `
export { createHooks } from '@verdant-web/react';
`;
