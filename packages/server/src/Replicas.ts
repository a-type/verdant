import { Database } from 'better-sqlite3';
import { TokenInfo } from './TokenVerifier.js';
import { ReplicaInfoSpec } from './types.js';

export class ReplicaInfos {
	constructor(
		private db: Database,
		private readonly replicaTruancyMinutes: number,
	) {}

	get truantCutoff() {
		return Date.now() - this.replicaTruancyMinutes * 60 * 1000;
	}

	get = (libraryId: string, replicaId: string): ReplicaInfoSpec | null => {
		const row = this.db
			.prepare(
				`
					SELECT * FROM ReplicaInfo
					WHERE id = ? AND libraryId = ?
				`,
			)
			.get(replicaId, libraryId);
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
			ackedServerOrder: row.ackedServerOrder,
		};
	};

	getOrCreate = (
		libraryId: string,
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
			WHERE id = ? AND libraryId = ?
			`,
			)
			.get(replicaId, libraryId);

		if (!replicaInfo) {
			this.db
				.prepare(
					`
			INSERT INTO ReplicaInfo (id, clientId, libraryId, type)
			VALUES (?, ?, ?, ?)
			`,
				)
				.run(replicaId, info.userId, libraryId, info.type);

			return {
				status: 'new',
				replicaInfo: {
					id: replicaId,
					clientId: info.userId,
					ackedLogicalTime: null,
					lastSeenWallClockTime: null,
					libraryId: libraryId,
					type: info.type,
					ackedServerOrder: 0,
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
					WHERE id = ? AND libraryId = ?
					`,
				)
				.run(info.type, replicaId, libraryId);
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

	getAllNonTruant = (libraryId: string): ReplicaInfoSpec[] => {
		return this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE libraryId = ? AND lastSeenWallClockTime > ?
		`,
			)
			.all(libraryId, this.truantCutoff);
	};

	getAll = (libraryId: string): ReplicaInfoSpec[] => {
		return this.db
			.prepare(
				`
			SELECT * FROM ReplicaInfo
			WHERE libraryId = ?
		`,
			)
			.all(libraryId);
	};

	updateLastSeen = (libraryId: string, replicaId: string) => {
		const clockTime = new Date().getTime();
		return this.db
			.prepare(
				`
      UPDATE ReplicaInfo
      SET lastSeenWallClockTime = ?
      WHERE id = ? AND libraryId = ?
    `,
			)
			.run(clockTime, replicaId, libraryId);
	};

	updateAcknowledged = (
		libraryId: string,
		replicaId: string,
		timestamp: string,
	) => {
		this.db
			.prepare(
				`
			UPDATE ReplicaInfo
			SET ackedLogicalTime = ?
			WHERE id = ? AND libraryId = ?
		`,
			)
			.run(timestamp, replicaId, libraryId);
	};

	updateServerOrder = (
		libraryId: string,
		replicaId: string,
		serverOrder: number,
	) => {
		// only increment the server order, never set it to lower than before
		this.db
			.prepare(
				`
			UPDATE ReplicaInfo
			SET ackedServerOrder = MAX(ackedServerOrder, ?)
			WHERE id = ? AND libraryId = ?
		`,
			)
			.run(serverOrder, replicaId, libraryId);
	};

	getEarliestAckedServerOrder = (libraryId: string) => {
		// get the earliest acked server order of all non-truant replicas
		const allAcks = (
			this.db
				.prepare(
					`
			SELECT ackedServerOrder FROM ReplicaInfo
			WHERE libraryId = ?
			AND lastSeenWallClockTime > ?
		`,
				)
				.all(libraryId, this.truantCutoff) as {
				ackedServerOrder: number | null;
			}[]
		).map((row: { ackedServerOrder: number | null }) => row.ackedServerOrder);

		if (allAcks.some((ack) => ack === null)) {
			return null;
		}
		return Math.min(...(allAcks as number[]));
	};

	acknowledgeOperation = (
		libraryId: string,
		replicaId: string,
		timestamp: string,
	) => {
		if (!timestamp) return;

		// get the server order from the operation with the timestamp and update the replica's server order
		// to the max of the current server order and the server order of the operation
		this.db
			.prepare(
				`
			UPDATE ReplicaInfo
			SET ackedLogicalTime = ?, ackedServerOrder = MAX(ackedServerOrder, COALESCE((
				SELECT serverOrder FROM OperationHistory
				WHERE libraryId = ? AND timestamp = ?
			), 0))
			WHERE id = ? AND libraryId = ?
			`,
			)
			.run(timestamp, libraryId, timestamp, replicaId, libraryId);
	};

	getGlobalAck = (libraryId: string, onlineReplicaIds?: string[]) => {
		const nonTruant = this.getAllNonTruant(libraryId);
		const globalAckEligible = nonTruant.filter(
			(replica) => replica.type < 2 || onlineReplicaIds?.includes(replica.id),
		);
		// get the earliest acked time
		return globalAckEligible.reduce(
			(acc, replica) => {
				if (!replica.ackedLogicalTime) {
					return acc;
				}
				if (acc === undefined) {
					return replica.ackedLogicalTime;
				}
				return acc < replica.ackedLogicalTime ? acc : replica.ackedLogicalTime;
			},
			undefined as string | undefined,
		);
	};

	delete = (libraryId: string, replicaId: string) => {
		return this.db
			.prepare(
				`
			DELETE FROM ReplicaInfo
			WHERE id = ? AND libraryId = ?
		`,
			)
			.run(replicaId, libraryId);
	};

	deleteAll = (libraryId: string) => {
		return this.db
			.prepare(
				`
			DELETE FROM ReplicaInfo
			WHERE libraryId = ?
		`,
			)
			.run(libraryId);
	};

	deleteAllForUser = (libraryId: string, userId: string) => {
		return this.db
			.prepare(`DELETE FROM ReplicaInfo WHERE libraryId = ? AND clientId = ?`)
			.run(libraryId, userId);
	};
}
