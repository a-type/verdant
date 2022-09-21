import { ReplicaInfo, SERVER_REPLICA_ID } from '@lofi/common';
import { Database } from 'better-sqlite3';
import { ReplicaInfoSpec } from './types.js';

export class ReplicaInfos {
	constructor(private db: Database, private libraryId: string) {}

	getOrCreate = (
		replicaId: string,
		clientId: string | null,
	): ReplicaInfoSpec => {
		if (replicaId !== SERVER_REPLICA_ID && clientId === null) {
			throw new Error('Client ID must be provided for non-server replicas');
		}

		this.db
			.prepare(
				`
      INSERT OR IGNORE INTO ReplicaInfo (id, libraryId, clientId)
      VALUES (?, ?, ?)
    `,
			)
			.run(replicaId, this.libraryId, clientId);
		return this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE id = ?
			`,
			)
			.get(replicaId);
	};

	getAll = (): ReplicaInfoSpec[] => {
		return this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE libraryId = ?
		`,
			)
			.all(this.libraryId);
	};

	updateOldestOperationTimestamp = (replicaId: string, timestamp: string) => {
		return this.db
			.prepare(
				`
      UPDATE ReplicaInfo
      SET oldestOperationLogicalTime = ?
      WHERE id = ?
    `,
			)
			.run(timestamp, replicaId);
	};

	updateLastSeen = (replicaId: string) => {
		const clockTime = new Date().getTime();
		return this.db
			.prepare(
				`
      UPDATE ReplicaInfo
      SET lastSeenWallClockTime = ?
      WHERE id = ?
    `,
			)
			.run(clockTime, replicaId);
	};

	updateAcknowledged = (replicaId: string, timestamp: string) => {
		return this.db
			.prepare(
				`
			UPDATE ReplicaInfo
			SET ackedLogicalTime = ?
			WHERE id = ?
		`,
			)
			.run(timestamp, replicaId);
	};

	getGlobalAck = () => {
		return this.db
			.prepare(
				`
			SELECT MIN(ackedLogicalTime) AS ackedLogicalTime
			FROM ReplicaInfo
			WHERE libraryId = ?
		`,
			)
			.get(this.libraryId).ackedLogicalTime;
	};
}
