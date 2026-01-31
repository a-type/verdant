import {
	AckMessage,
	DisconnectingMessage,
	DocumentBaseline,
	getOidRoot,
	HeartbeatMessage,
	ObjectIdentifier,
	Operation,
	OperationMessage,
	pickValidOperationKeys,
	PresenceUpdateMessage,
	SyncMessage,
	VerdantInternalPresence,
} from '@verdant-web/common';

import { Context } from '../context/context.js';
import { PersistenceMetadataDb } from './interfaces.js';
import type { PersistenceMetadata } from './PersistenceMetadata.js';

export class MessageCreator {
	constructor(
		private db: PersistenceMetadataDb,
		private meta: PersistenceMetadata,
		private ctx: Pick<Context, 'time' | 'schema' | 'log'>,
	) {}

	createOperation = async (
		init: Pick<OperationMessage, 'operations'> & {
			timestamp?: string;
		},
	): Promise<OperationMessage> => {
		const localInfo = await this.meta.getLocalReplica();
		this.ctx.log('debug', 'Creating operation message', init.operations.length);
		return {
			type: 'op',
			timestamp: this.ctx.time.now,
			replicaId: localInfo.id,
			operations: init.operations.map(pickValidOperationKeys),
		};
	};

	/**
	 * @param since - override local understanding of last sync time
	 */
	createSyncStep1 = async (since?: string | null): Promise<SyncMessage> => {
		const localReplicaInfo = await this.meta.getLocalReplica();

		const provideChangesSince =
			since === null ? null : localReplicaInfo.lastSyncedLogicalTime;

		// collect all of our operations that are newer than the server's last operation
		// if server replica isn't stored, we're syncing for the first time.
		const operations: Operation[] = [];
		const affectedDocs = new Set<ObjectIdentifier>();

		return this.db.transaction(
			{
				mode: 'readwrite',
				storeNames: ['operations', 'baselines'],
			},
			async (tx) => {
				// FIXME: this branch gives bad vibes. should we always
				// send all operations from other replicas too? is there
				// ever a case where we have a "since" timestamp and there
				// are foreign ops that match it?
				if (provideChangesSince) {
					this.ctx.log(
						'debug',
						'Syncing local operations since',
						provideChangesSince,
					);
					await this.db.iterateLocalOperations(
						(patch) => {
							operations.push(pickValidOperationKeys(patch));
							affectedDocs.add(getOidRoot(patch.oid));
						},
						{
							after: provideChangesSince,
							// block on writes to prevent race conditions
							transaction: tx,
						},
					);
				} else {
					this.ctx.log('debug', 'Syncing all operations');
					// if providing the whole history, don't limit to only local
					// operations
					await this.db.iterateAllOperations(
						(patch) => {
							operations.push(pickValidOperationKeys(patch));
							affectedDocs.add(getOidRoot(patch.oid));
						},
						{
							transaction: tx,
						},
					);
				}
				// we only need to send baselines if we've never synced before
				let baselines: DocumentBaseline[] = [];
				if (!provideChangesSince) {
					await this.db.iterateAllBaselines(
						(b) => {
							baselines.push(b);
						},
						{
							transaction: tx,
						},
					);
				}

				if (operations.length > 0) {
					this.ctx.log(
						'debug',
						`Syncing ${operations.length} operations since ${provideChangesSince}`,
					);
				}

				return {
					type: 'sync',
					schemaVersion: this.ctx.schema.version,
					timestamp: this.ctx.time.now,
					replicaId: localReplicaInfo.id,
					resyncAll: !localReplicaInfo.lastSyncedLogicalTime,
					operations,
					baselines,
					since: provideChangesSince,
				};
			},
		);
	};

	createPresenceUpdate = async (data: {
		presence?: any;
		internal?: VerdantInternalPresence;
	}): Promise<PresenceUpdateMessage> => {
		const localReplicaInfo = await this.meta.getLocalReplica();
		return {
			type: 'presence-update',
			presence: data.presence,
			replicaId: localReplicaInfo.id,
			internal: data.internal,
		};
	};

	createHeartbeat = async (): Promise<HeartbeatMessage> => {
		return {
			type: 'heartbeat',
		};
	};

	createAck = async (nonce: string): Promise<AckMessage> => {
		const localReplicaInfo = await this.meta.getLocalReplica();
		return {
			type: 'ack',
			timestamp: this.ctx.time.now,
			replicaId: localReplicaInfo.id,
			nonce,
		};
	};

	createDisconnecting = async (
		reason: string,
	): Promise<DisconnectingMessage> => {
		const localReplicaInfo = await this.meta.getLocalReplica();
		return {
			type: 'disconnecting',
			replicaId: localReplicaInfo.id,
			reason,
		};
	};
}
