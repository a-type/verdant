import { Database } from 'better-sqlite3';
import { ClientMessage } from '@lo-fi/common';
import { ServerLibraryManager } from './ServerLibrary.js';
import { MessageSender } from './MessageSender.js';
import { UserProfiles, UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import { migrations } from './migrations.js';

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
	private libraries;
	private db;
	private sender;

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
		this.libraries = new ServerLibraryManager({
			db: this.db,
			sender: this.sender,
			profileLoader: this.profileLoader,
			replicaTruancyMinutes,
			log,
			disableRebasing,
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
		const library = this.libraries.open(libraryId);
		return library.receive(message, clientKey, info);
	};

	/**
	 * Call when a replica disconnects from the server
	 */
	remove = (libraryId: string, replicaId: string) => {
		const library = this.libraries.open(libraryId);
		library.remove(replicaId);
	};

	evictLibrary = (libraryId: string) => {
		const library = this.libraries.open(libraryId);
		library.destroy();
	};

	evictUser = (libraryId: string, userId: string) => {
		const library = this.libraries.open(libraryId);
		library.evictUser(userId);
	};

	private createSchema = () => {
		migrations(this.db);
	};

	close = async () => {
		this.db.close();
	};

	getLibraryPresence = (libraryId: string) => {
		const library = this.libraries.open(libraryId);
		return library.getPresence();
	};
}
