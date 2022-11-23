export const typingsPreamble = `
import type { StorageSchema } from '@lo-fi/common';
import type { Storage, StorageInitOptions, ObjectEntity, ListEntity, Query, ServerSync } from '@lo-fi/web';
export * from '@lo-fi/web';

`;

export const clientImplementation = `
import { Storage, StorageDescriptor } from '@lo-fi/web';
export * from '@lo-fi/web';

export const Client = Storage;
export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    super({ ...init, schema });
  }
};
`;

export const clientPackage = `
{
  "name": "lo-fi-client",
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
export { createHooks } from '@lo-fi/react';
`;
