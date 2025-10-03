import { ReplicaType, VerdantError } from '@verdant-web/common';
import { StoredReplicaInfo } from '../../types.js';
import { ReplicaStorage } from '../Storage.js';
import { SqliteExecutor } from './database.js';
import { ReplicaInfoRow } from './tables.js';

export class SqlReplicas implements ReplicaStorage {
	constructor(
		private db: SqliteExecutor,
		private libraryId: string,
		private readonly replicaTruancyMinutes: number,
	) {}

	get truantCutoff(): number {
		return Date.now() - this.replicaTruancyMinutes * 60 * 1000;
	}

	private attachLibraryId = (row: ReplicaInfoRow) => {
		(row as any).libraryId = this.libraryId;
		return row as StoredReplicaInfo;
	};

	get = async (replicaId: string): Promise<StoredReplicaInfo | null> => {
		const db = this.db;
		const row = db.first<ReplicaInfoRow>(
			`SELECT * FROM ReplicaInfo WHERE id = ?`,
			[replicaId],
		);
		if (row) return this.attachLibraryId(row);
		return row;
	};
	getOrCreate = async (
		replicaId: string,
		info: { userId: string; type: ReplicaType },
	): Promise<{
		status: 'new' | 'existing' | 'truant';
		replicaInfo: StoredReplicaInfo;
	}> => {
		const existing = await this.get(replicaId);
		if (!existing) {
			const db = this.db;
			const created = db.first<ReplicaInfoRow>(
				`INSERT INTO ReplicaInfo (id, clientId, type, ackedServerOrder) VALUES (?, ?, ?, ?)
					ON CONFLICT(id) DO NOTHING
					RETURNING *`,
				[replicaId, info.userId, info.type, 0],
			);
			if (!created) {
				throw new VerdantError(
					VerdantError.Code.Unexpected,
					undefined,
					'Failed to create replica',
				);
			}
			return {
				status: 'new',
				replicaInfo: this.attachLibraryId(created),
			};
		}

		if (existing.type !== info.type) {
			const db = this.db;
			// type should be updated if a new token changes it
			db.exec(`UPDATE ReplicaInfo SET type = ? WHERE id = ?`, [
				info.type,
				replicaId,
			]);
		}

		if (existing.clientId !== info.userId) {
			// replicas cannot change hands - this is a security issue
			throw new VerdantError(
				VerdantError.Code.Forbidden,
				undefined,
				'Another user is already using this replica ID',
			);
		}

		if (
			existing.lastSeenWallClockTime !== null &&
			existing.lastSeenWallClockTime < this.truantCutoff
		) {
			return { status: 'truant', replicaInfo: existing };
		}

		return { status: 'existing', replicaInfo: existing };
	};

	getAll = async (
		options?: { omitTruant: boolean } | undefined,
	): Promise<StoredReplicaInfo[]> => {
		const result = this.db.query<ReplicaInfoRow>(
			`SELECT * FROM ReplicaInfo${options?.omitTruant ? ' WHERE lastSeenWallClockTime > ?' : ''}`,
			options?.omitTruant ? [this.truantCutoff] : [],
		);

		return result.map(this.attachLibraryId);
	};

	updateLastSeen = async (replicaId: string): Promise<void> => {
		const clockTime = Date.now();
		const db = this.db;
		db.exec(`UPDATE ReplicaInfo SET lastSeenWallClockTime = ? WHERE id = ?`, [
			clockTime,
			replicaId,
		]);
	};

	updateAckedServerOrder = async (
		replicaId: string,
		serverOrder: number,
	): Promise<void> => {
		this.db.exec(
			`UPDATE ReplicaInfo SET ackedServerOrder = MAX(ackedServerOrder, ?) WHERE id = ?`,
			[serverOrder, replicaId],
		);
	};

	updateAcknowledgedLogicalTime = async (
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		this.db.exec(`UPDATE ReplicaInfo SET ackedLogicalTime = ? WHERE id = ?`, [
			timestamp,
			replicaId,
		]);
	};

	getEarliestAckedServerOrder = async (): Promise<number> => {
		// gets earliest acked server order of all non-truant replicas.
		const res = this.db.first<Pick<ReplicaInfoRow, 'ackedServerOrder'>>(
			`SELECT ackedServerOrder FROM ReplicaInfo WHERE lastSeenWallClockTime > ? ORDER BY ackedServerOrder ASC LIMIT 1`,
			[this.truantCutoff],
		);
		return res?.ackedServerOrder ?? 0;
	};

	acknowledgeOperation = async (
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		if (!timestamp) return;
		// when acking an operation, we also set the replica's server order
		// to that operation's server order, if it's greater.
		this.db.exec(
			`UPDATE ReplicaInfo SET
					ackedLogicalTime = ?,
					ackedServerOrder = MAX(
						ackedServerOrder,
						COALESCE(
							(
								SELECT serverOrder FROM OperationHistory
								WHERE timestamp = ?
							),
							0
						)
					)
				WHERE id = ?`,
			[timestamp, timestamp, replicaId],
		);
	};

	getGlobalAck = async (
		onlineReplicaIds?: string[] | undefined,
	): Promise<string | null> => {
		const nonTruant = await this.getAll({ omitTruant: true });
		if (nonTruant.length === 0) return null;
		const globalAckEligible = nonTruant.filter(
			(replica) => replica.type < 2 || onlineReplicaIds?.includes(replica.id),
		);

		return globalAckEligible.reduce(
			(acc, replica) => {
				if (!replica.ackedLogicalTime) return acc;
				if (acc === null) return replica.ackedLogicalTime;
				return acc < replica.ackedLogicalTime ? acc : replica.ackedLogicalTime;
			},
			null as string | null,
		);
	};
	delete = async (replicaId: string): Promise<void> => {
		this.db.exec(`DELETE FROM ReplicaInfo WHERE id = ?`, [replicaId]);
	};
	deleteAll = async (): Promise<void> => {
		this.db.exec(`DELETE FROM ReplicaInfo`, []);
	};
	deleteAllForUser = async (userId: string): Promise<void> => {
		this.db.exec(`DELETE FROM ReplicaInfo WHERE clientId = ?`, [userId]);
	};
	forceTruant = async (replicaId: string): Promise<void> => {
		this.db.exec(
			`UPDATE ReplicaInfo SET lastSeenWallClockTime = ? WHERE id = ?`,
			[Date.now() - this.replicaTruancyMinutes * 60 * 1000 - 1, replicaId],
		);
	};
}
