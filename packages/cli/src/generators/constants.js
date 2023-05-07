export const clientImplementation = `
import { Storage, StorageDescriptor } from '@verdant/web';
export * from '@verdant/web';

export const Client = Storage;
export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    super({ ...init, schema });
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
export { createHooks } from '@verdant/react';
`;
