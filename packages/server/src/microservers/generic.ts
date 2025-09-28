import { LibraryFileInfo } from '../libraries/Library.js';
import { LibraryInfo } from '../types.js';

export interface GenericMicroserverManager {
	get(libraryId: string, env: any): Promise<GenericMicroserver>;
}

export interface GenericMicroserver {
	getFileInfo(fileId: string): Promise<LibraryFileInfo | null>;
	forceTruant: (replicaId: string) => Promise<void>;
	getInfo: () => Promise<LibraryInfo | null>;
	getDocumentSnapshot: (collection: string, id: string) => any;
}
