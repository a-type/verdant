import {
	DocumentBaseline,
	getOidRoot,
	HeartbeatMessage,
	ObjectIdentifier,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	SendMessageMessage,
	SyncAckMessage,
	SyncMessage,
} from '@lo-fi/common';

import { Metadata } from './Metadata.js';

export class MessageCreator {
	constructor(private meta: Metadata) {}

	createOperation = async (
		init: Pick<OperationMessage, 'operations'> & {
			timestamp?: string;
		},
	): Promise<OperationMessage> => {
		const localInfo = await this.meta.localReplica.get();
		return {
			type: 'op',
			timestamp: this.meta.now,
			replicaId: localInfo.id,
			operations: init.operations.map((op) => ({
				data: op.data,
				oid: op.oid,
				timestamp: op.timestamp,
			})),
		};
	};

	createMigrationOperation = async ({
		targetVersion,
		...init
	}: Pick<OperationMessage, 'operations'> & {
		targetVersion: number;
	}): Promise<OperationMessage> => {
		const localInfo = await this.meta.localReplica.get();
		return {
			type: 'op',
			operations: init.operations.map((op) => ({
				...op,
				timestamp: this.meta.time.zero(targetVersion),
			})),
			timestamp: this.meta.time.zero(targetVersion),
			replicaId: localInfo.id,
		};
	};

	/**
	 * @param since - override local understanding of last sync time
	 */
	createSyncStep1 = async (since?: string | null): Promise<SyncMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();

		const provideChangesSince =
			since === null ? null : localReplicaInfo.lastSyncedLogicalTime;

		// collect all of our operations that are newer than the server's last operation
		// if server replica isn't stored, we're syncing for the first time.
		const operations: Operation[] = [];
		const affectedDocs = new Set<ObjectIdentifier>();
		await this.meta.operations.iterateOverAllLocalOperations(
			(patch) => {
				operations.push({
					data: patch.data,
					oid: patch.oid,
					timestamp: patch.timestamp,
				});
				affectedDocs.add(getOidRoot(patch.oid));
			},
			{
				after: provideChangesSince,
				// block on writes to prevent race conditions
				mode: 'readwrite',
			},
		);
		// we only need to send baselines if we've never synced before
		let baselines: DocumentBaseline[] = [];
		if (!provideChangesSince) {
			baselines = await this.meta.baselines.getAllSince('');
		}

		return {
			type: 'sync',
			schemaVersion: this.meta.schema.currentVersion,
			timestamp: this.meta.now,
			replicaId: localReplicaInfo.id,
			resyncAll: !localReplicaInfo.lastSyncedLogicalTime,
			operations,
			baselines,
			since: provideChangesSince,
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

	createSyncAck = async (nonce: string): Promise<SyncAckMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();
		return {
			type: 'sync-ack',
			timestamp: this.meta.now,
			replicaId: localReplicaInfo.id,
			nonce,
		};
	};

	createSendMessage = async (
		message: string,
		toUserId?: string,
	): Promise<SendMessageMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();

		return {
			type: 'send-message',
			message,
			toUserId,
			replicaId: localReplicaInfo.id,
			timestamp: this.meta.now,
		};
	};
}
