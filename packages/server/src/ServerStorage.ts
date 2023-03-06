import { Database } from 'better-sqlite3';
import { ClientMessage, EventSubscriber } from '@lo-fi/common';
import { ServerLibrary, ServerLibraryEvents } from './ServerLibrary.js';
import { MessageSender } from './MessageSender.js';
import { UserProfiles, UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import { migrations } from './migrations.js';
import { FileInfo, FileStorage } from './files/FileStorage.js';
import { FileMetadata, FileMetadataConfig } from './files/FileMetadata.js';

interface ServerStorageOptions {
	db: Database;
	sender: MessageSender;
	profiles: UserProfiles<any>;
	replicaTruancyMinutes: number;
	log?: (...args: any[]) => void;
	disableRebasing?: boolean;
	fileConfig?: FileMetadataConfig;
	fileStorage?: FileStorage;
}

export class ServerStorage {
	private profileLoader;
	private library;
	private db;
	private sender;
	private fileMetadata;
	private fileStorage: FileStorage | undefined;

	constructor({
		db,
		sender,
		profiles,
		replicaTruancyMinutes,
		disableRebasing = false,
		log = () => {},
		fileConfig,
		fileStorage,
	}: ServerStorageOptions) {
		this.db = db;
		this.sender = sender;
		this.createSchema();
		this.profileLoader = new UserProfileLoader(profiles);
		this.fileMetadata = new FileMetadata(this.db, fileConfig);
		this.fileStorage = fileStorage;
		this.library = new ServerLibrary({
			db: this.db,
			sender: this.sender,
			profiles: this.profileLoader,
			replicaTruancyMinutes,
			log,
			disableRebasing,
			fileMetadata: this.fileMetadata,
			fileStorage: this.fileStorage,
		});
	}

	/**
	 * Call with any message from any replica
	 */
	receive = (
		libraryId: string,
		clientKey: string,
		message: ClientMessage,
		info: TokenInfo,
	) => {
		return this.library.receive(message, clientKey, info);
	};

	/**
	 * Call when a replica disconnects from the server
	 */
	remove = (libraryId: string, replicaId: string) => {
		this.library.remove(libraryId, replicaId);
	};

	evictLibrary = async (libraryId: string) => {
		await this.library.destroy(libraryId);
	};

	evictUser = (libraryId: string, userId: string) => {
		this.library.evictUser(libraryId, userId);
	};

	private createSchema = () => {
		migrations(this.db);
	};

	close = async () => {
		this.db.close();
	};

	getLibraryPresence = (libraryId: string) => {
		return this.library.getPresence(libraryId);
	};

	getDocumentSnapshot = (libraryId: string, oid: string) => {
		return this.library.getDocumentSnapshot(libraryId, oid);
	};

	putFileInfo = (libraryId: string, fileInfo: FileInfo) => {
		this.fileMetadata.put(libraryId, fileInfo);
	};

	getFileInfo = (libraryId: string, fileId: string) => {
		return this.fileMetadata.get(libraryId, fileId);
	};
}
