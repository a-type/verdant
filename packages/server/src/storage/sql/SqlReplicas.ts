import { StoredReplicaInfo } from '../../types.js';
import { ReplicaStorage } from '../Storage.js';
import { sql, type Kysely } from 'kysely';
import { Database } from './tables.js';
import { ReplicaType, VerdantError } from '@verdant-web/common';

export class SqlReplicas implements ReplicaStorage {
	constructor(
		private db: Kysely<Database>,
		private readonly replicaTruancyMinutes: number,
		private readonly dialect: 'sqlite' | 'postgres',
	) {}

	get truantCutoff(): number {
		return Date.now() - this.replicaTruancyMinutes * 60 * 1000;
	}

	get = async (
		libraryId: string,
		replicaId: string,
	): Promise<StoredReplicaInfo | null> => {
		return (
			(await this.db
				.selectFrom('ReplicaInfo')
				.where('libraryId', '=', libraryId)
				.where('id', '=', replicaId)
				.selectAll()
				.executeTakeFirst()) ?? null
		);
	};
	getOrCreate = async (
		libraryId: string,
		replicaId: string,
		info: { userId: string; type: ReplicaType },
	): Promise<{
		status: 'new' | 'existing' | 'truant';
		replicaInfo: StoredReplicaInfo;
	}> => {
		const existing = await this.get(libraryId, replicaId);
		if (!existing) {
			const created = await this.db
				.insertInto('ReplicaInfo')
				.values({
					id: replicaId,
					clientId: info.userId,
					libraryId,
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
			return { status: 'new', replicaInfo: created };
		}

		if (existing.type !== info.type) {
			// type should be updated if a new token changes it
			await this.db
				.updateTable('ReplicaInfo')
				.set({ type: info.type })
				.where('libraryId', '=', libraryId)
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
		libraryId: string,
		options?: { omitTruant: boolean } | undefined,
	): Promise<StoredReplicaInfo[]> => {
		let builder = this.db
			.selectFrom('ReplicaInfo')
			.where('libraryId', '=', libraryId);

		if (options?.omitTruant) {
			builder = builder.where('lastSeenWallClockTime', '>', this.truantCutoff);
		}

		return builder.selectAll().execute();
	};

	updateLastSeen = async (
		libraryId: string,
		replicaId: string,
	): Promise<void> => {
		const clockTime = Date.now();
		await this.db
			.updateTable('ReplicaInfo')
			.set({ lastSeenWallClockTime: clockTime })
			.where('libraryId', '=', libraryId)
			.where('id', '=', replicaId)
			.execute();
	};

	updateAckedServerOrder = async (
		libraryId: string,
		replicaId: string,
		serverOrder: number,
	): Promise<void> => {
		const max = this.dialect === 'postgres' ? 'GREATEST' : 'MAX';
		await this.db
			.updateTable('ReplicaInfo')
			.set(
				'ackedServerOrder',
				({ val }) =>
					sql<number>`${sql.raw(max)}(ackedServerOrder, ${val(serverOrder)})`,
			)
			.where('libraryId', '=', libraryId)
			.where('id', '=', replicaId)
			.execute();
	};

	updateAcknowledgedLogicalTime = async (
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		await this.db
			.updateTable('ReplicaInfo')
			.set({ ackedLogicalTime: timestamp })
			.where('libraryId', '=', libraryId)
			.where('id', '=', replicaId)
			.execute();
	};

	getEarliestAckedServerOrder = async (libraryId: string): Promise<number> => {
		// gets earliest acked server order of all non-truant replicas.
		const res = await this.db
			.selectFrom('ReplicaInfo')
			.where('libraryId', '=', libraryId)
			.where('lastSeenWallClockTime', '>', this.truantCutoff)
			.orderBy('ackedServerOrder', 'asc')
			.select('ackedServerOrder')
			.executeTakeFirst();
		return res?.ackedServerOrder ?? 0;
	};

	acknowledgeOperation = async (
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		if (!timestamp) return;
		// when acking an operation, we also set the replica's server order
		// to that operation's server order, if it's greater.
		const max = this.dialect === 'postgres' ? 'GREATEST' : 'MAX';
		await this.db
			.updateTable('ReplicaInfo')
			.set({ ackedLogicalTime: timestamp })
			.set(
				'ackedServerOrder',
				({ val }) => sql<number>`${sql.raw(max)}(
					ackedServerOrder,
					COALESCE(
						(
        			SELECT serverOrder FROM OperationHistory
        			WHERE libraryId = ${val(libraryId)} AND timestamp = ${val(timestamp)}
      			),
						0
					)
				)`,
			)
			.where('libraryId', '=', libraryId)
			.where('id', '=', replicaId)
			.execute();
	};

	getGlobalAck = async (
		libraryId: string,
		onlineReplicaIds?: string[] | undefined,
	): Promise<string | null> => {
		const nonTruant = await this.getAll(libraryId, { omitTruant: true });
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
	delete = async (libraryId: string, replicaId: string): Promise<void> => {
		await this.db
			.deleteFrom('ReplicaInfo')
			.where('libraryId', '=', libraryId)
			.where('id', '=', replicaId)
			.execute();
	};
	deleteAll = async (libraryId: string): Promise<void> => {
		await this.db
			.deleteFrom('ReplicaInfo')
			.where('libraryId', '=', libraryId)
			.execute();
	};
	deleteAllForUser = async (
		libraryId: string,
		userId: string,
	): Promise<void> => {
		await this.db
			.deleteFrom('ReplicaInfo')
			.where('libraryId', '=', libraryId)
			.where('clientId', '=', userId)
			.execute();
	};
}
