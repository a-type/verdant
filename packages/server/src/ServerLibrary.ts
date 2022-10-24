import {
	AckMessage,
	applyPatch,
	ClientMessage,
	HeartbeatMessage,
	omit,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	ReplicaInfo,
	SERVER_REPLICA_ID,
	SyncMessage,
	SyncStep2Message,
} from '@lo-fi/common';
import { Database } from 'better-sqlite3';
import { ReplicaInfos } from './Replicas.js';
import { MessageSender } from './MessageSender.js';
import { OperationHistory, OperationHistoryItem } from './OperationHistory.js';
import { Baselines } from './Baselines.js';
import { Presence } from './Presence.js';
import { UserProfileLoader } from './Profiles.js';

export class ServerLibrary {
	private db;
	private sender;
	private profiles;
	private id;
	private replicas;
	private operations;
	private baselines;
	private presences = new Presence();

	constructor({
		db,
		sender,
		profiles,
		id,
		replicaTruancyMinutes,
	}: {
		db: Database;
		sender: MessageSender;
		profiles: UserProfileLoader<any>;
		id: string;
		replicaTruancyMinutes: number;
	}) {
		this.db = db;
		this.sender = sender;
		this.profiles = profiles;
		this.id = id;
		this.replicas = new ReplicaInfos(this.db, this.id, replicaTruancyMinutes);
		this.operations = new OperationHistory(this.db, this.id);
		this.baselines = new Baselines(this.db, this.id);
		this.presences.on('lost', this.onPresenceLost);
	}

	/**
	 * Validates a user's access to a replica. If the replica does not
	 * exist, a user may create it. But if it does exist, its user (clientId)
	 * must match the user making the request.
	 */
	private validateReplicaAccess = (replicaId: string, userId: string) => {
		const replica = this.replicas.get(replicaId);
		if (replica && replica.clientId !== userId) {
			throw new Error(
				`Replica ${replicaId} does not belong to client ${userId}`,
			);
		}
	};

	receive = (message: ClientMessage, userId: string) => {
		this.validateReplicaAccess(message.replicaId, userId);

		switch (message.type) {
			case 'op':
				this.handleOperation(message);
				break;
			case 'sync':
				this.handleSync(message, userId);
				break;
			case 'sync-step2':
				this.handleSyncStep2(message, userId);
				break;
			case 'ack':
				this.handleAck(message, userId);
				break;
			case 'heartbeat':
				this.handleHeartbeat(message, userId);
				break;
			case 'presence-update':
				this.handlePresenceUpdate(message, userId);
				break;
			default:
				console.log('Unknown message type', (message as any).type);
				break;
		}
		this.replicas.updateLastSeen(message.replicaId);
	};

	remove = (replicaId: string) => {
		this.presences.removeReplica(replicaId);
	};

	private handleOperation = (message: OperationMessage) => {
		const run = this.db.transaction(() => {
			// insert patches into history
			this.operations.insertAll(message.replicaId, message.operations);

			// update client's oldest timestamp
			if (message.oldestHistoryTimestamp) {
				this.replicas.updateOldestOperationTimestamp(
					message.replicaId,
					message.oldestHistoryTimestamp,
				);
			}
		});

		run();

		this.enqueueRebase();

		// rebroadcast to whole library except the sender
		this.rebroadcastOperations(message.replicaId, message.operations);
	};

	private removeExtraOperationData = (
		operation: OperationHistoryItem,
	): Operation => {
		return omit(operation, ['replicaId']);
	};

	private rebroadcastOperations = (replicaId: string, ops: Operation[]) => {
		this.sender.broadcast(
			this.id,
			{
				type: 'op-re',
				operations: ops,
				replicaId,
				globalAckTimestamp: this.replicas.getGlobalAck(),
			},
			[replicaId],
		);
	};

	private handleSync = (message: SyncMessage, clientId: string) => {
		const replicaId = message.replicaId;

		if (message.resyncAll) {
			// forget our local understanding of the replica and reset it
			this.replicas.delete(replicaId);
		}

		const { status, replicaInfo: clientReplicaInfo } =
			this.replicas.getOrCreate(replicaId, clientId);

		if (status === 'truant') {
			console.log('A truant replica has reconnected', replicaId);
		}

		// respond to client

		const changesSince =
			status === 'existing' ? clientReplicaInfo.ackedLogicalTime : null;

		// lookup operations after the last ack the client gave us
		const ops = this.operations.getAfter(changesSince);
		const baselines = this.baselines.getAllAfter(changesSince);

		// new, unseen replicas should reset their existing storage
		// to that of the server when joining a library.
		// truant replicas should also reset their storage.
		const replicaShouldReset = !!message.resyncAll || status !== 'existing';
		// We detect that a library is new by checking if it has any history.
		// If there are no existing operations or baselines (and the requested
		// history timerange was "everything", i.e. "from null"), then this is
		// a fresh library which should receive the first client's history as its
		// own. Otherwise, if the client requested a reset, we should send them
		// the full history of the library.
		// the definition of this field could be improved to be more explicit
		// and not rely on seemingly unrelated data.
		const isEmptyLibrary =
			changesSince === null && ops.length === 0 && baselines.length === 0;

		this.sender.send(this.id, replicaId, {
			type: 'sync-resp',
			operations: ops.map(this.removeExtraOperationData),
			baselines: baselines.map((baseline) => ({
				oid: baseline.oid,
				snapshot: baseline.snapshot,
				timestamp: baseline.timestamp,
			})),
			provideChangesSince: clientReplicaInfo.ackedLogicalTime,
			globalAckTimestamp: this.replicas.getGlobalAck(),
			peerPresence: this.presences.all(),
			// only request the client to overwrite local data if a reset is requested
			// and there is data to overwrite it. otherwise the client may still
			// send its own history to us.
			overwriteLocalData: replicaShouldReset && !isEmptyLibrary,
		});
	};

	private handleSyncStep2 = (message: SyncStep2Message, clientId: string) => {
		// store all incoming operations and baselines
		this.baselines.insertAll(message.baselines);

		console.debug('Storing', message.operations.length, 'operations');
		this.operations.insertAll(message.replicaId, message.operations);
		this.rebroadcastOperations(message.replicaId, message.operations);

		// update the client's ackedLogicalTime
		const lastOperation = message.operations[message.operations.length - 1];
		if (lastOperation) {
			this.replicas.updateAcknowledged(
				message.replicaId,
				lastOperation.timestamp,
			);
		}
	};

	private handleAck = (message: AckMessage, clientId: string) => {
		this.replicas.updateAcknowledged(message.replicaId, message.timestamp);
	};

	private pendingRebaseTimeout: NodeJS.Timeout | null = null;
	private enqueueRebase = () => {
		if (!this.pendingRebaseTimeout) {
			setTimeout(this.rebase, 0);
		}
	};

	private rebase = () => {
		console.log('Performing rebase check');

		// fundamentally a rebase occurs when some conditions are met:
		// 1. the replica which created an operation has dropped that operation
		//    from their history stack, i.e. their oldest timestamp is after it.
		// 2. all other replicas have acknowledged an operation since the
		//    operation which will be flattened to the baseline. i.e. global
		//    ack > timestamp.
		//
		// to determine which rebases we can do, we use a heuristic.
		// the maximal set of operations we could potentially rebase is
		// up to the newest 'oldest timestamp' of any replica. so we
		// grab that slice of the operations history, then iterate over it
		// and check if any rebase conditions are met.

		const replicas = this.replicas.getAllNonTruant();
		// more convenient access
		const replicaMap = replicas.reduce((map, replica) => {
			map[replica.id] = replica;
			return map;
		}, {} as Record<string, ReplicaInfo>);
		// will be useful
		const globalAck = this.replicas.getGlobalAck();

		const newestOldestTimestamp = replicas
			.map((r) => r.oldestOperationLogicalTime)
			.reduce((a, b) => (a && b && a > b ? a : b), '');

		if (!newestOldestTimestamp) {
			console.debug(
				'Cannot rebase; some replicas do not have oldest history timestamp',
			);
			return;
		}

		// these are in forward chronological order
		const ops = this.operations.getBefore(newestOldestTimestamp);

		const opsToApply: Record<string, OperationHistoryItem[]> = {};
		// if we encounter a sequential operation in history which does
		// not meet our conditions, we must ignore subsequent operations
		// applied to that document.
		const hardStops: Record<string, boolean> = {};

		for (const op of ops) {
			const creator = replicaMap[op.replicaId];
			const isBeforeCreatorsOldestHistory =
				!creator ||
				(creator.oldestOperationLogicalTime &&
					creator.oldestOperationLogicalTime > op.timestamp);
			const isBeforeGlobalAck = globalAck > op.timestamp;
			if (
				!hardStops[op.oid] &&
				isBeforeCreatorsOldestHistory &&
				isBeforeGlobalAck
			) {
				opsToApply[op.oid] = opsToApply[op.oid] || [];
				opsToApply[op.oid].push(op);
			} else {
				hardStops[op.oid] = true;
			}
		}

		for (const [documentId, ops] of Object.entries(opsToApply)) {
			console.log('Rebasing', documentId);
			this.baselines.applyOperations(documentId, ops);
			this.operations.dropAll(ops);
		}

		// now that we know exactly which operations can be squashed,
		// we can summarize that for the clients so they don't have to
		// do this work!
		const rebases = Object.entries(opsToApply).map(([oid, ops]) => ({
			oid,
			upTo: ops[ops.length - 1].timestamp,
		}));
		if (rebases.length) {
			this.sender.broadcast(this.id, {
				type: 'rebases',
				rebases,
			});
		}
	};

	private handleHeartbeat = (message: HeartbeatMessage, clientId: string) => {
		this.sender.send(this.id, message.replicaId, {
			type: 'heartbeat-response',
		});
	};

	private handlePresenceUpdate = async (
		message: PresenceUpdateMessage,
		clientId: string,
	) => {
		this.presences.set(clientId, {
			presence: message.presence,
			replicaId: message.replicaId,
			profile: await this.profiles.get(clientId),
			id: clientId,
		});
		this.sender.broadcast(
			this.id,
			{
				type: 'presence-changed',
				replicaId: message.replicaId,
				userInfo: {
					id: clientId,
					presence: message.presence,
					profile: await this.profiles.get(clientId),
					replicaId: message.replicaId,
				},
			},
			// mirror back to the replica which sent it so it has profile
			[],
		);
	};

	private onPresenceLost = (replicaId: string, userId: string) => {
		console.log('User disconnected from all replicas:', userId);
		this.sender.broadcast(this.id, {
			type: 'presence-offline',
			replicaId,
			userId,
		});
	};

	private applyOperations = (baseline: any, operations: Operation[]) => {
		for (const op of operations) {
			baseline = this.applyOperation(baseline, op);
		}
		return baseline;
	};

	private applyOperation = (baseline: any, operation: Operation) => {
		return applyPatch(baseline, operation.data);
	};
}

export class ServerLibraryManager {
	private db;
	private sender;
	private profileLoader;
	private replicaTruancyMinutes;
	private cache = new Map<string, ServerLibrary>();

	constructor({
		db,
		sender,
		profileLoader,
		replicaTruancyMinutes,
	}: {
		db: Database;
		sender: MessageSender;
		profileLoader: UserProfileLoader<any>;
		replicaTruancyMinutes: number;
	}) {
		this.db = db;
		this.sender = sender;
		this.profileLoader = profileLoader;
		this.replicaTruancyMinutes = replicaTruancyMinutes;
	}

	open = (id: string) => {
		if (!this.cache.has(id)) {
			this.cache.set(
				id,
				new ServerLibrary({
					db: this.db,
					sender: this.sender,
					profiles: this.profileLoader,
					id,
					replicaTruancyMinutes: this.replicaTruancyMinutes,
				}),
			);
		}

		return this.cache.get(id)!;
	};

	close = (id: string) => {
		this.cache.delete(id);
	};
}
