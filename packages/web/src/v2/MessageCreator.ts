import {
	HeartbeatMessage,
	PresenceUpdateMessage,
	SyncMessage,
	SyncResponseMessage,
	SyncStep2Message,
	TimestampProvider,
	getOidRoot,
	OperationPatch,
	OperationMessage,
	Operation,
} from '@lofi/common';
import cuid from 'cuid';

import { Metadata } from './Metadata.js';

export class MessageCreator {
	constructor(private meta: Metadata) {}

	createOperation = async (
		init: Pick<OperationMessage, 'operations' | 'oldestHistoryTimestamp'> & {
			timestamp?: string;
		},
	): Promise<OperationMessage> => {
		const localInfo = await this.meta.localReplica.get();
		const opId = cuid();
		return {
			type: 'op',
			timestamp: this.meta.now,
			replicaId: localInfo.id,
			operations: init.operations,
			oldestHistoryTimestamp: init.oldestHistoryTimestamp,
		};
	};

	createMigrationOperation = async ({
		targetVersion,
		...init
	}: Pick<OperationMessage, 'operations' | 'oldestHistoryTimestamp'> & {
		targetVersion: number;
	}): Promise<OperationMessage> => {
		const localInfo = await this.meta.localReplica.get();
		return {
			type: 'op',
			operations: init.operations.map((op) => ({
				...op,
				timestamp: this.meta.sync.time.zero(targetVersion),
			})),
			timestamp: this.meta.sync.time.zero(targetVersion),
			replicaId: localInfo.id,
		};
	};

	createSyncStep1 = async (resyncAll?: boolean): Promise<SyncMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();

		return {
			type: 'sync',
			schemaVersion: this.meta.schema.currentVersion,
			timestamp: this.meta.now,
			replicaId: localReplicaInfo.id,
			resyncAll,
		};
	};

	/**
	 * Pulls all local operations the server has not seen.
	 */
	createSyncStep2 = async (
		provideChangesSince: SyncResponseMessage['provideChangesSince'],
	): Promise<SyncStep2Message> => {
		const localReplicaInfo = await this.meta.localReplica.get();
		// collect all of our operations that are newer than the server's last operation
		// if server replica isn't stored, we're syncing for the first time.
		const operations: Operation[] = [];
		await this.meta.operations.iterateOverAllLocalOperations(
			(patch) => {
				operations.push(patch);
			},
			{
				after: provideChangesSince,
			},
		);
		// for now we just send every baseline for every
		// affected document... TODO: optimize this
		const affectedDocs = new Set(
			operations.map((patch) => getOidRoot(patch.oid)),
		);
		const baselines = await this.meta.baselines.getAllForMultipleDocuments(
			Array.from(affectedDocs),
		);

		return {
			type: 'sync-step2',
			timestamp: this.meta.now,
			operations,
			// don't send empty baselines
			baselines: baselines.filter(Boolean),
			replicaId: localReplicaInfo.id,
		};
	};

	createPresenceUpdate = async (
		presence: any,
	): Promise<PresenceUpdateMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();
		return {
			type: 'presence-update',
			presence,
			replicaId: localReplicaInfo.id,
		};
	};

	createHeartbeat = async (): Promise<HeartbeatMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();
		return {
			type: 'heartbeat',
			timestamp: this.meta.now,
			replicaId: localReplicaInfo.id,
		};
	};
}
