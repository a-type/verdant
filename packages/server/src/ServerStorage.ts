import { Database } from 'better-sqlite3';
import { ClientMessage } from '@lo-fi/common';
import { ServerLibrary } from './ServerLibrary.js';
import { MessageSender } from './MessageSender.js';
import { UserProfiles, UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import { migrations } from './migrations.js';
import { FileInfo } from './files/FileStorage.js';
import { FileMetadata } from './files/FileMetadata.js';

interface ServerStorageOptions {
	db: Database;
	sender: MessageSender;
	profiles: UserProfiles<any>;
	replicaTruancyMinutes: number;
	log?: (...args: any[]) => void;
	disableRebasing?: boolean;
}

export class ServerStorage {
	private profileLoader;
	private library;
	private db;
	private sender;
	private fileMetadata;

	constructor({
		db,
		sender,
		profiles,
		replicaTruancyMinutes,
		disableRebasing = false,
		log = () => {},
	}: ServerStorageOptions) {
		this.db = db;
		this.sender = sender;
		this.createSchema();
		this.profileLoader = new UserProfileLoader(profiles);
		this.fileMetadata = new FileMetadata(this.db);
		this.library = new ServerLibrary({
			db: this.db,
			sender: this.sender,
			profiles: this.profileLoader,
			replicaTruancyMinutes,
			log,
			disableRebasing,
			fileMetadata: this.fileMetadata,
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

	evictLibrary = (libraryId: string) => {
		this.library.destroy(libraryId);
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
