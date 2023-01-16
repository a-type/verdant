import {
	AckMessage,
	applyPatch,
	applyOperations,
	ClientMessage,
	DocumentBaseline,
	HeartbeatMessage,
	omit,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	ReplicaInfo,
	ReplicaType,
	SyncMessage,
	isObjectRef,
} from '@lo-fi/common';
import { Database } from 'better-sqlite3';
import { ReplicaInfos } from './Replicas.js';
import { MessageSender } from './MessageSender.js';
import { OperationHistory, OperationHistoryItem } from './OperationHistory.js';
import { Baselines } from './Baselines.js';
import { Presence } from './Presence.js';
import { UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import AsyncLock from 'async-lock';

export class ServerLibrary {
	private db;
	private sender;
	private profiles;
	private id;
	private replicas;
	private operations;
	private baselines;
	private presences = new Presence();
	private disableRebasing: boolean;

	private log: (...args: any[]) => void;
	constructor({
		db,
		sender,
		profiles,
		id,
		replicaTruancyMinutes,
		log = () => {},
		disableRebasing,
	}: {
		db: Database;
		sender: MessageSender;
		profiles: UserProfileLoader<any>;
		id: string;
		replicaTruancyMinutes: number;
		log?: (...args: any[]) => void;
		disableRebasing?: boolean;
	}) {
		this.db = db;
		this.log = log;
		this.disableRebasing = !!disableRebasing;
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
	private validateReplicaAccess = (replicaId: string, info: TokenInfo) => {
		const replica = this.replicas.get(replicaId);
		if (replica && replica.clientId !== info.userId) {
			throw new Error(
				`Replica ${replicaId} does not belong to client ${info.userId}`,
			);
		}
	};

	private hasWriteAccess = (info: TokenInfo) => {
		return (
			info.type !== ReplicaType.ReadOnlyPull &&
			info.type !== ReplicaType.ReadOnlyRealtime
		);
	};

	receive = async (
		message: ClientMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.validateReplicaAccess(message.replicaId, info);

		switch (message.type) {
			case 'op':
				this.handleOperation(message, clientKey, info);
				break;
			case 'sync':
				this.handleSync(message, clientKey, info);
				break;
			case 'ack':
				this.handleAck(message, clientKey, info);
				break;
			case 'heartbeat':
				this.handleHeartbeat(message, clientKey);
				break;
			case 'presence-update':
				await this.handlePresenceUpdate(message, clientKey, info);
				break;
			default:
				this.log('Unknown message type', (message as any).type);
				break;
		}
		this.replicas.updateLastSeen(message.replicaId);
	};

	remove = (replicaId: string) => {
		this.presences.removeReplica(replicaId);
	};

	private handleOperation = (
		message: OperationMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		if (!message.operations.length) return;

		if (!this.hasWriteAccess(info)) {
			this.sender.send(this.id, clientKey, {
				type: 'forbidden',
			});
			return;
		}

		const run = this.db.transaction(() => {
			// insert patches into history
			this.operations.insertAll(message.replicaId, message.operations);
		});

		run();

		this.enqueueRebase();

		// rebroadcast to whole library except the sender
		this.rebroadcastOperations(
			clientKey,
			message.replicaId,
			message.operations,
			[],
		);

		// tell sender we got and processed their operation
		this.sender.send(this.id, clientKey, {
			type: 'server-ack',
			timestamp: message.timestamp,
		});

		// TODO: evaluate if this is correct!!!
		this.updateAcknowledged(
			message.replicaId,
			message.operations[message.operations.length - 1].timestamp,
			info,
		);
	};

	private removeExtraOperationData = (
		operation: OperationHistoryItem,
	): Operation => {
		return omit(operation, ['replicaId']);
	};

	private rebroadcastOperations = (
		clientKey: string,
		replicaId: string,
		ops: Operation[],
		baselines: DocumentBaseline[],
	) => {
		if (ops.length === 0 && baselines.length === 0) return;

		this.sender.broadcast(
			this.id,
			{
				type: 'op-re',
				operations: ops,
				baselines,
				replicaId,
				globalAckTimestamp: this.replicas.getGlobalAck(),
			},
			[clientKey],
		);
	};

	private handleSync = (
		message: SyncMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		const replicaId = message.replicaId;

		if (!this.hasWriteAccess(info)) {
			this.sender.send(this.id, clientKey, {
				type: 'forbidden',
			});
			return;
		}

		if (message.resyncAll) {
			// forget our local understanding of the replica and reset it
			this.replicas.delete(replicaId);
		}

		const { status, replicaInfo: clientReplicaInfo } =
			this.replicas.getOrCreate(replicaId, info);

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

		// if the local library is empty and the replica is new to us,
		// but the replica is providing a "since" timestamp, this
		// suggests the local data is incomplete or gone. we request
		// this replica should respond with a full history.
		if (isEmptyLibrary && status === 'new' && message.since !== null) {
			this.log(
				'Detected local data is incomplete, requesting full history from replica',
				replicaId,
			);
			this.sender.send(this.id, clientKey, {
				type: 'need-since',
				since: null,
			});
			return;
		}

		const overwriteLocalData = replicaShouldReset && !isEmptyLibrary;
		if (overwriteLocalData) {
			this.log(
				'Overwriting local data for replica',
				replicaId,
				'with',
				baselines.length,
				'baselines and',
				ops.length,
				'operations',
			);
		}

		// only write incoming replica data to storage if
		// we are not overwriting the replica's data
		if (!overwriteLocalData) {
			// store all incoming operations and baselines
			this.baselines.insertAll(message.baselines);

			this.log(
				'Storing',
				message.baselines.length,
				'baselines and',
				message.operations.length,
				'operations',
			);
			this.operations.insertAll(replicaId, message.operations);
			this.rebroadcastOperations(
				clientKey,
				message.replicaId,
				message.operations,
				message.baselines,
			);
		}

		if (status === 'truant') {
			this.log('A truant replica has reconnected', replicaId);
		}

		// respond to client

		this.sender.send(this.id, clientKey, {
			type: 'sync-resp',
			operations: ops.map(this.removeExtraOperationData),
			baselines: baselines.map((baseline) => ({
				oid: baseline.oid,
				snapshot: baseline.snapshot,
				timestamp: baseline.timestamp,
			})),
			globalAckTimestamp: this.replicas.getGlobalAck(),
			peerPresence: this.presences.all(),
			// only request the client to overwrite local data if a reset is requested
			// and there is data to overwrite it. otherwise the client may still
			// send its own history to us.
			overwriteLocalData,
			ackedTimestamp: message.timestamp,
		});
	};

	private updateAcknowledged = (
		replicaId: string,
		timestamp: string,
		info: TokenInfo,
	) => {
		const priorGlobalAck = this.replicas.getGlobalAck();
		this.replicas.updateAcknowledged(replicaId, timestamp);
		const newGlobalAck = this.replicas.getGlobalAck();
		if (newGlobalAck && priorGlobalAck !== newGlobalAck) {
			this.sender.broadcast(this.id, {
				type: 'global-ack',
				timestamp: newGlobalAck,
			});
		}
	};

	private handleAck = (
		message: AckMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.updateAcknowledged(message.replicaId, message.timestamp, info);
	};

	private pendingRebaseTimeout: NodeJS.Timeout | null = null;
	private enqueueRebase = () => {
		if (this.disableRebasing) return;

		if (!this.pendingRebaseTimeout) {
			setTimeout(this.rebase, 0);
		}
	};

	private rebase = () => {
		if (this.disableRebasing) return;

		this.log('Performing rebase check');

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

		// for global ack, to determine consensus, also allow
		// for all actively connected replicas to ack regardless of their
		// type.
		const activeReplicaIds = Object.values(this.presences.all()).map(
			(p) => p.replicaId,
		);
		const globalAck = this.replicas.getGlobalAck(activeReplicaIds);

		if (!globalAck) {
			this.log('No global ack, skipping rebase');
			return;
		}

		// these are in forward chronological order
		const ops = this.operations.getBefore(globalAck);

		const opsToApply: Record<string, OperationHistoryItem[]> = {};
		// if we encounter a sequential operation in history which does
		// not meet our conditions, we must ignore subsequent operations
		// applied to that document.
		const hardStops: Record<string, boolean> = {};

		for (const op of ops) {
			const isBeforeGlobalAck = globalAck > op.timestamp;
			if (!hardStops[op.oid] && isBeforeGlobalAck) {
				opsToApply[op.oid] = opsToApply[op.oid] || [];
				opsToApply[op.oid].push(op);
			} else {
				hardStops[op.oid] = true;
			}
		}

		for (const [documentId, ops] of Object.entries(opsToApply)) {
			this.log('Rebasing', documentId);
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
			// hint to clients they can rebase too
			this.sender.broadcast(this.id, {
				type: 'global-ack',
				timestamp: globalAck,
			});
		}
	};

	private handleHeartbeat = (_: HeartbeatMessage, clientKey: string) => {
		this.sender.send(this.id, clientKey, {
			type: 'heartbeat-response',
		});
	};

	private handlePresenceUpdate = async (
		message: PresenceUpdateMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.presences.set(info.userId, {
			presence: message.presence,
			replicaId: message.replicaId,
			profile: await this.profiles.get(info.userId),
			id: info.userId,
		});
		this.sender.broadcast(
			this.id,
			{
				type: 'presence-changed',
				replicaId: message.replicaId,
				userInfo: {
					id: info.userId,
					presence: message.presence,
					profile: await this.profiles.get(info.userId),
					replicaId: message.replicaId,
				},
			},
			// mirror back to the replica which sent it so it has profile
			[],
		);
	};

	private onPresenceLost = (replicaId: string, userId: string) => {
		this.log('User disconnected from all replicas:', userId);
		this.sender.broadcast(this.id, {
			type: 'presence-offline',
			replicaId,
			userId,
		});
	};

	destroy = () => {
		this.presences.clear();
		this.replicas.deleteAll();
		this.operations.deleteAll();
		this.baselines.deleteAll();
	};

	getPresence = () => {
		return this.presences.all();
	};

	evictUser = (userId: string) => {
		this.replicas.deleteAllForUser(userId);
	};

	getDocumentSnapshot = (documentId: string) => {
		return this.hydrateObject(documentId);
	};

	private getObjectSnapshot = (oid: string) => {
		const baseline = this.baselines.get(oid);
		const ops = this.operations.getAllFor(oid);
		const snapshot = applyOperations(baseline?.snapshot ?? undefined, ops);
		return snapshot;
	};

	private hydrateObject = (oid: string): any => {
		const snapshot = this.getObjectSnapshot(oid);
		if (Array.isArray(snapshot)) {
			return snapshot.map((item, index) => {
				if (isObjectRef(item)) {
					return this.hydrateObject(item.id);
				} else {
					return item;
				}
			});
		} else if (snapshot && typeof snapshot === 'object') {
			const hydrated = { ...snapshot };
			for (const [key, value] of Object.entries(snapshot)) {
				if (isObjectRef(value)) {
					hydrated[key] = this.hydrateObject(value.id);
				}
			}
			return hydrated;
		} else {
			return snapshot;
		}
	};
}

export class ServerLibraryManager {
	private db;
	private sender;
	private profileLoader;
	private replicaTruancyMinutes;
	private cache = new Map<string, ServerLibrary>();
	private log: (...args: any[]) => void;
	private disableRebasing: boolean;

	constructor({
		db,
		sender,
		profileLoader,
		replicaTruancyMinutes,
		log,
		disableRebasing = false,
	}: {
		db: Database;
		sender: MessageSender;
		profileLoader: UserProfileLoader<any>;
		replicaTruancyMinutes: number;
		log: (...args: any[]) => void;
		disableRebasing?: boolean;
	}) {
		this.db = db;
		this.log = log;
		this.sender = sender;
		this.profileLoader = profileLoader;
		this.replicaTruancyMinutes = replicaTruancyMinutes;
		this.disableRebasing = disableRebasing;
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
					log: this.log,
					disableRebasing: this.disableRebasing,
				}),
			);
		}

		return this.cache.get(id)!;
	};

	close = (id: string) => {
		this.cache.delete(id);
	};
}
