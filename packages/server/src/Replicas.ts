import { Database } from 'better-sqlite3';
import { ReplicaInfoSpec } from './types.js';

export class ReplicaInfos {
	constructor(private db: Database, private libraryId: string) {}

	getOrCreate = (
		replicaId: string,
		clientId: string,
	): { created: boolean; replicaInfo: ReplicaInfoSpec } => {
		const replicaInfo = this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE id = ?
			`,
			)
			.get(replicaId);

		if (!replicaInfo) {
			this.db
				.prepare(
					`
			INSERT INTO ReplicaInfo (id, clientId, libraryId)
			VALUES (?, ?, ?)
			`,
				)
				.run(replicaId, clientId, this.libraryId);

			return {
				created: true,
				replicaInfo: {
					id: replicaId,
					clientId,
					ackedLogicalTime: null,
					oldestOperationLogicalTime: null,
					lastSeenWallClockTime: null,
					libraryId: this.libraryId,
				},
			};
		}

		return {
			created: false,
			replicaInfo,
		};
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

	delete = (replicaId: string) => {
		return this.db
			.prepare(
				`
			DELETE FROM ReplicaInfo
			WHERE id = ?
		`,
			)
			.run(replicaId);
	};
}
