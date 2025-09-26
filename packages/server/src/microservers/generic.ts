import { ClientMessage } from '@verdant-web/common';
import { Readable } from 'stream';
import { TokenInfo } from '../TokenVerifier.js';
import { FileInfo } from '../files/FileStorage.js';
import { LibraryFileInfo } from '../libraries/Library.js';

export interface GenericMicroserverManager {
	get(libraryId: string, env: any): Promise<GenericMicroserver>;
}

export interface GenericMicroserver {
	handleMessage(
		key: string,
		info: TokenInfo,
		message: ClientMessage,
	): Promise<void>;
	uploadFile(fileStream: Readable, info: FileInfo): Promise<void>;
	getFileInfo(fileId: string): Promise<LibraryFileInfo | null>;
	// not especially elegant...
	onRequest: (
		clientKey: string,
		req: Request,
		info: TokenInfo,
	) => () => Response;
	forceTruant: (replicaId: string) => Promise<void>;
}
