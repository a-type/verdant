import {
	AckMessage,
	DocumentBaseline,
	getOidRoot,
	HeartbeatMessage,
	ObjectIdentifier,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	SyncAckMessage,
	SyncMessage,
} from '@verdant-web/common';

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

		// FIXME: this branch gives bad vibes. should we always
		// send all operations from other replicas too? is there
		// ever a case where we have a "since" timestamp and there
		// are foreign ops that match it?
		if (provideChangesSince) {
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
		} else {
			// if providing the whole history, don't limit to only local
			// operations
			await this.meta.operations.iterateOverAllOperations(
				(patch) => {
					operations.push({
						data: patch.data,
						oid: patch.oid,
						timestamp: patch.timestamp,
					});
					affectedDocs.add(getOidRoot(patch.oid));
				},
				{
					mode: 'readwrite',
				},
			);
		}
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

	createAck = async (nonce: string): Promise<AckMessage> => {
		const localReplicaInfo = await this.meta.localReplica.get();
		return {
			type: 'ack',
			timestamp: this.meta.now,
			replicaId: localReplicaInfo.id,
			nonce,
		};
	};
}
