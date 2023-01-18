import schema from './schema';
import { Storage, StorageDescriptor } from '@lo-fi/web';
export * from '@lo-fi/web';

export const Client = Storage;
export class ClientDescriptor extends StorageDescriptor {
	constructor(init) {
		super({ ...init, schema });
	}
}
