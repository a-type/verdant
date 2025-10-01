import {
	ClientMessage,
	createOid,
	EventSubscriber,
	VerdantError,
} from '@verdant-web/common';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import { UserProfileLoader } from '../Profiles.js';
import { TokenInfo, TokenVerifier } from '../TokenVerifier.js';
import { ClientConnectionManager } from '../connections/ClientConnection.js';
import {
	FileInfo,
	FileStorage,
	FileStorageLibraryDelegate,
} from '../files/FileStorage.js';
import { Library } from '../internals.js';
import { Logger } from '../logger.js';
import { StorageFactory } from '../storage/Storage.js';
import { LibraryEvents } from './Library.js';
import { LibraryApi } from './generic.js';

export interface SingleNodeMicroserverConfig {
	storage: StorageFactory;
	fileStorage?: FileStorage;
	disableRebasing?: boolean;
	profiles: UserProfileLoader<any>;
	tokenVerifier: TokenVerifier;
	log?: Logger;
	__testMode?: boolean;
}

const noop = () => {};

export class SingleNodeLibraryManager {
	public readonly events = new EventSubscriber<LibraryEvents>();
	private microserverPromises: Map<string, Promise<SingleNodeMicroserver>> =
		new Map();

	constructor(private ctx: SingleNodeMicroserverConfig) {}

	public get tokenVerifier() {
		return this.ctx.tokenVerifier;
	}

	public get log() {
		return this.ctx.log ?? noop;
	}

	public get __testMode() {
		return this.ctx.__testMode === true;
	}

	get = async (libraryId: string) => {
		let microserverPromise = this.microserverPromises.get(libraryId);
		if (!microserverPromise) {
			microserverPromise = this.constructMicroserver(libraryId);
			this.microserverPromises.set(libraryId, microserverPromise);
		}
		return microserverPromise;
	};

	evict = async (libraryId: string) => {
		const lib = await this.get(libraryId);
		await lib.destroy();
		this.microserverPromises.delete(libraryId);
	};

	private constructMicroserver = async (libraryId: string) => {
		const clientConnections = new ClientConnectionManager({
			profiles: this.ctx.profiles,
		});
		const storage = await this.ctx.storage(libraryId);
		const library = new Library({
			storage,
			id: libraryId,
			events: this.events,
			sender: clientConnections,
			presence: clientConnections.presence,
			log: (level, ...args) =>
				this.ctx.log?.(level, `[Library ${libraryId}]`, ...args),
			fileStorage: this.ctx.fileStorage
				? new FileStorageLibraryDelegate(libraryId, this.ctx.fileStorage)
				: undefined,
			disableRebasing: this.ctx.disableRebasing || false,
		});
		return new SingleNodeMicroserver(library, clientConnections, this.ctx);
	};
}

export class SingleNodeMicroserver implements LibraryApi {
	constructor(
		private library: Library,
		public readonly clientConnections: ClientConnectionManager,
		private ctx: SingleNodeMicroserverConfig,
	) {}

	handleMessage = async (
		key: string,
		info: TokenInfo,
		message: ClientMessage,
	) => {
		return this.library.handleMessage(message, key, info);
	};

	uploadFile = async (
		fileStream: Readable | ReadableStream | any,
		info: FileInfo,
	) => {
		if (!this.ctx.fileStorage) {
			throw new VerdantError(
				VerdantError.Code.ConfigurationError,
				undefined,
				'File storage not configured',
			);
		}
		await this.library.putFileInfo(info);
		await this.ctx.fileStorage.put(fileStream, info);
	};

	getFileInfo = async (fileId: string) => {
		return this.library.getFileInfo(fileId);
	};

	onRequest = this.clientConnections.addFetch.bind(this.clientConnections);

	getDocumentSnapshot = async (
		collection: string,
		documentId: string,
	): Promise<any | null> => {
		return this.library.getDocumentSnapshot(createOid(collection, documentId));
	};

	destroy = async () => {
		this.clientConnections.disconnectAll();
		await this.library.destroy();
	};

	getInfo = async () => {
		return this.library.getInfo();
	};

	forceTruant = async (replicaId: string) => {
		await this.library.forceTruant(replicaId);
	};
}
