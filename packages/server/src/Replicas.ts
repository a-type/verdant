import { Database } from 'better-sqlite3';
import { TokenInfo } from './TokenVerifier.js';
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
			type: row.type,
		};
	};

	getOrCreate = (
		replicaId: string,
		info: TokenInfo,
	): {
		status: 'new' | 'existing' | 'truant';
		replicaInfo: ReplicaInfoSpec;
	} => {
		const replicaInfo: ReplicaInfoSpec = this.db
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
			INSERT INTO ReplicaInfo (id, clientId, libraryId, type)
			VALUES (?, ?, ?, ?)
			`,
				)
				.run(replicaId, info.userId, this.libraryId, info.type);

			return {
				status: 'new',
				replicaInfo: {
					id: replicaId,
					clientId: info.userId,
					ackedLogicalTime: null,
					lastSeenWallClockTime: null,
					libraryId: this.libraryId,
					type: info.type,
				},
			};
		}

		if (replicaInfo.type !== info.type) {
			// type should be updated if a new token changes it
			this.db
				.prepare(
					`
					UPDATE ReplicaInfo
					SET type = ?
					WHERE id = ?
					`,
				)
				.run(info.type, replicaId);
		}

		if (replicaInfo.clientId !== info.userId) {
			throw new Error(
				`Replica ${replicaId} already exists with a different user ID`,
			);
		}

		if (
			replicaInfo.lastSeenWallClockTime &&
			replicaInfo.lastSeenWallClockTime < this.truantCutoff
		) {
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

	getGlobalAck = (onlineReplicaIds?: string[]) => {
		const nonTruant = this.getAllNonTruant();
		const globalAckEligible = nonTruant.filter(
			(replica) => replica.type < 2 || onlineReplicaIds?.includes(replica.id),
		);
		// get the earliest acked time
		return globalAckEligible.reduce((acc, replica) => {
			if (!replica.ackedLogicalTime) {
				return acc;
			}
			if (acc === undefined) {
				return replica.ackedLogicalTime;
			}
			return acc < replica.ackedLogicalTime ? acc : replica.ackedLogicalTime;
		}, undefined as string | undefined);
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

	deleteAll = () => {
		return this.db
			.prepare(
				`
			DELETE FROM ReplicaInfo
			WHERE libraryId = ?
		`,
			)
			.run(this.libraryId);
	};
}
