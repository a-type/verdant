import { Database } from 'better-sqlite3';
import { ClientMessage } from '@lo-fi/common';
import { ServerLibraryManager } from './ServerLibrary.js';
import { MessageSender } from './MessageSender.js';
import { UserProfiles, UserProfileLoader } from './Profiles.js';

interface ServerStorageOptions {
	db: Database;
	sender: MessageSender;
	profiles: UserProfiles<any>;
	replicaTruancyMinutes: number;
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
		});
	}

	/**
	 * Call with any message from any replica
	 */
	receive = (
		libraryId: string,
		clientKey: string,
		message: ClientMessage,
		clientId: string,
	) => {
		console.debug('Received message', libraryId, clientId, message);

		const library = this.libraries.open(libraryId);
		library.receive(message, clientKey, clientId);
	};

	/**
	 * Call when a replica disconnects from the server
	 */
	remove = (libraryId: string, replicaId: string) => {
		const library = this.libraries.open(libraryId);
		library.remove(replicaId);
	};

	private createSchema = () => {
		const run = this.db.transaction(() => {
			this.db
				.prepare(
					`
        CREATE TABLE IF NOT EXISTS ReplicaInfo (
          id TEXT PRIMARY KEY NOT NULL,
          libraryId TEXT NOT NULL,
					clientId TEXT NOT NULL,
          lastSeenWallClockTime INTEGER,
          ackedLogicalTime TEXT,
          oldestOperationLogicalTime TEXT
        );
      `,
				)
				.run();

			this.db
				.prepare(
					`
        CREATE TABLE IF NOT EXISTS OperationHistory (
          libraryId TEXT NOT NULL,
					replicaId TEXT NOT NULL,
          oid TEXT NOT NULL,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
					PRIMARY KEY (libraryId, replicaId, oid, timestamp)
        );
      `,
				)
				.run();

			this.db
				.prepare(
					`
        CREATE TABLE IF NOT EXISTS DocumentBaseline (
          oid TEXT PRIMARY KEY NOT NULL,
          snapshot TEXT,
          timestamp TEXT NOT NULL,
					libraryId TEXT NOT NULL
        );
      `,
				)
				.run();
		});

		run();
	};
}
