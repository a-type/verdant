import { LibraryInfo } from '../types.js';
import { LibraryFileInfo } from './Library.js';

export interface LibraryApi {
	getFileInfo(fileId: string): Promise<LibraryFileInfo | null>;
	forceTruant: (replicaId: string) => Promise<void>;
	getInfo: () => Promise<LibraryInfo | null>;
	getDocumentSnapshot: (collection: string, id: string) => any;
}
