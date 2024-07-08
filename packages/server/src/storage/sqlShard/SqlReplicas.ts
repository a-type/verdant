import { StoredReplicaInfo } from '../../types.js';
import { ReplicaStorage } from '../Storage.js';
import { sql, type Kysely } from 'kysely';
import { Database, ReplicaInfoRow } from './tables.js';
import { ReplicaType, VerdantError } from '@verdant-web/common';
import { Databases } from './Databases.js';

export class SqlReplicas implements ReplicaStorage {
	constructor(
		private dbs: Databases,
		private readonly replicaTruancyMinutes: number,
		private readonly dialect: 'sqlite' | 'postgres',
	) {}

	get truantCutoff(): number {
		return Date.now() - this.replicaTruancyMinutes * 60 * 1000;
	}

	private attachLibraryId = (libraryId: string, row: ReplicaInfoRow) => {
		(row as any).libraryId = libraryId;
		return row as StoredReplicaInfo;
	};

	get = async (
		libraryId: string,
		replicaId: string,
	): Promise<StoredReplicaInfo | null> => {
		const db = await this.dbs.get(libraryId);
		const row =
			(await db
				.selectFrom('ReplicaInfo')
				.where('id', '=', replicaId)
				.selectAll()
				.executeTakeFirst()) ?? null;
		if (row) return this.attachLibraryId(libraryId, row);
		return row;
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
			const db = await this.dbs.get(libraryId);
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
				replicaInfo: this.attachLibraryId(libraryId, created),
			};
		}

		if (existing.type !== info.type) {
			const db = await this.dbs.get(libraryId);
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

		console.log(
			'last seen',
			existing.lastSeenWallClockTime,
			'truant cutoff',
			this.truantCutoff,
			'now',
			Date.now(),
			'diff',
			Date.now() - (existing.lastSeenWallClockTime ?? 0),
		);

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
		const db = await this.dbs.get(libraryId);
		let builder = db.selectFrom('ReplicaInfo');

		if (options?.omitTruant) {
			builder = builder.where('lastSeenWallClockTime', '>', this.truantCutoff);
		}

		return (await builder.selectAll().execute()).map(
			this.attachLibraryId.bind(this, libraryId),
		);
	};

	updateLastSeen = async (
		libraryId: string,
		replicaId: string,
	): Promise<void> => {
		const clockTime = Date.now();
		console.log('updating last seen', libraryId, replicaId, clockTime);
		const db = await this.dbs.get(libraryId);
		await db
			.updateTable('ReplicaInfo')
			.set({ lastSeenWallClockTime: clockTime })
			.where('id', '=', replicaId)
			.execute();
	};

	updateAckedServerOrder = async (
		libraryId: string,
		replicaId: string,
		serverOrder: number,
	): Promise<void> => {
		const max = this.dialect === 'postgres' ? 'GREATEST' : 'MAX';
		const db = await this.dbs.get(libraryId);
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
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db
			.updateTable('ReplicaInfo')
			.set({ ackedLogicalTime: timestamp })
			.where('id', '=', replicaId)
			.execute();
	};

	getEarliestAckedServerOrder = async (libraryId: string): Promise<number> => {
		const db = await this.dbs.get(libraryId);
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
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void> => {
		if (!timestamp) return;
		const db = await this.dbs.get(libraryId);
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
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('ReplicaInfo').where('id', '=', replicaId).execute();
	};
	deleteAll = async (libraryId: string): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('ReplicaInfo').execute();
	};
	deleteAllForUser = async (
		libraryId: string,
		userId: string,
	): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('ReplicaInfo').where('clientId', '=', userId).execute();
	};
}
