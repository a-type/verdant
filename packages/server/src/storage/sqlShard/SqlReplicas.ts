import { ReplicaType, VerdantError } from '@verdant-web/common';
import { Kysely, sql } from 'kysely';
import { StoredReplicaInfo } from '../../types.js';
import { ReplicaStorage } from '../Storage.js';
import { Database, ReplicaInfoRow } from './tables.js';

export class SqlReplicas implements ReplicaStorage {
	constructor(
		private db: Kysely<Database>,
		private libraryId: string,
		private readonly replicaTruancyMinutes: number,
		private readonly dialect: 'sqlite' | 'postgres',
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
		const row =
			(await db
				.selectFrom('ReplicaInfo')
				.where('id', '=', replicaId)
				.selectAll()
				.executeTakeFirst()) ?? null;
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
			const created = await db
				.insertInto('ReplicaInfo')
				.values({
					id: replicaId,
					clientId: info.userId,
					type: info.type,
					ackedServerOrder: 0,
				})
				.returningAll()
				.executeTakeFirst();
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
			await db
				.updateTable('ReplicaInfo')
				.set({ type: info.type })
				.where('id', '=', replicaId)
				.execute();
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
		const db = this.db;
		let builder = db.selectFrom('ReplicaInfo');

		if (options?.omitTruant) {
			builder = builder.where('lastSeenWallClockTime', '>', this.truantCutoff);
		}

		return (await builder.selectAll().execute()).map(this.attachLibraryId);
	};

	updateLastSeen = async (replicaId: string): Promise<void> => {
		const clockTime = Date.now();
		const db = this.db;
		await db
			.updateTable('ReplicaInfo')
			.set({ lastSeenWallClockTime: clockTime })
			.where('id', '=', replicaId)
			.execute();
	};

	updateAckedServerOrder = async (
		replicaId: string,
		serverOrder: number,
	): Promise<void> => {
		const max = this.dialect === 'postgres' ? 'GREATEST' : 'MAX';
		const db = this.db;
		await db
			.updateTable('ReplicaInfo')
			.set(
				'ackedServerOrder',
				({ val }) =>
					sql<number>`${sql.raw(max)}(ackedServerOrder, ${val(serverOrder)})`,
			)
			.where('id', '=', replicaId)
			.execute();
	};

	updateAcknowledgedLogicalTime = async (
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		const db = this.db;
		await db
			.updateTable('ReplicaInfo')
			.set({ ackedLogicalTime: timestamp })
			.where('id', '=', replicaId)
			.execute();
	};

	getEarliestAckedServerOrder = async (): Promise<number> => {
		const db = this.db;
		// gets earliest acked server order of all non-truant replicas.
		const res = await db
			.selectFrom('ReplicaInfo')
			.where('lastSeenWallClockTime', '>', this.truantCutoff)
			.orderBy('ackedServerOrder', 'asc')
			.select('ackedServerOrder')
			.executeTakeFirst();
		return res?.ackedServerOrder ?? 0;
	};

	acknowledgeOperation = async (
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		if (!timestamp) return;
		const db = this.db;
		// when acking an operation, we also set the replica's server order
		// to that operation's server order, if it's greater.
		const max = this.dialect === 'postgres' ? 'GREATEST' : 'MAX';
		await db
			.updateTable('ReplicaInfo')
			.set({ ackedLogicalTime: timestamp })
			.set(
				'ackedServerOrder',
				({ val }) => sql<number>`${sql.raw(max)}(
					ackedServerOrder,
					COALESCE(
						(
        			SELECT serverOrder FROM OperationHistory
        			WHERE timestamp = ${val(timestamp)}
      			),
						0
					)
				)`,
			)
			.where('id', '=', replicaId)
			.execute();
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
		const db = this.db;
		await db.deleteFrom('ReplicaInfo').where('id', '=', replicaId).execute();
	};
	deleteAll = async (): Promise<void> => {
		const db = this.db;
		await db.deleteFrom('ReplicaInfo').execute();
	};
	deleteAllForUser = async (userId: string): Promise<void> => {
		const db = this.db;
		await db.deleteFrom('ReplicaInfo').where('clientId', '=', userId).execute();
	};
}
