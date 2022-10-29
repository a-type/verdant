import { Database } from 'better-sqlite3';
import { ReplicaInfoSpec } from './types.js';

export class ReplicaInfos {
	constructor(
		private db: Database,
		private libraryId: string,
		private readonly replicaTruancyMinutes: number,
	) {}

	private get truantCutoff() {
		return Date.now() - this.replicaTruancyMinutes * 60 * 1000;
	}

	get = (replicaId: string): ReplicaInfoSpec | null => {
		const row = this.db
			.prepare(
				`
					SELECT * FROM ReplicaInfo
					WHERE id = ?
				`,
			)
			.get(replicaId);
		if (!row) {
			return null;
		}
		return {
			id: row.id,
			libraryId: row.libraryId,
			clientId: row.clientId,
			lastSeenWallClockTime: row.lastSeenWallClockTime,
			ackedLogicalTime: row.ackedLogicalTime,
		};
	};

	getOrCreate = (
		replicaId: string,
		clientId: string,
	): {
		status: 'new' | 'existing' | 'truant';
		replicaInfo: ReplicaInfoSpec;
	} => {
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
				status: 'new',
				replicaInfo: {
					id: replicaId,
					clientId,
					ackedLogicalTime: null,
					lastSeenWallClockTime: null,
					libraryId: this.libraryId,
				},
			};
		}

		if (replicaInfo.clientId !== clientId) {
			throw new Error(
				`Replica ${replicaId} already exists with a different clientId`,
			);
		}

		if (replicaInfo.lastSeenWallClockTime < this.truantCutoff) {
			return {
				status: 'truant',
				replicaInfo,
			};
		}

		return {
			status: 'existing',
			replicaInfo,
		};
	};

	getAllNonTruant = (): ReplicaInfoSpec[] => {
		return this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE libraryId = ? AND lastSeenWallClockTime > ?
		`,
			)
			.all(this.libraryId, this.truantCutoff);
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
		// filters out replicas that haven't been seen in a while
		return this.db
			.prepare(
				`
			SELECT MIN(ackedLogicalTime) AS ackedLogicalTime
			FROM ReplicaInfo
			WHERE libraryId = ? AND lastSeenWallClockTime > ?
		`,
			)
			.get(this.libraryId, this.truantCutoff).ackedLogicalTime as string;
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
