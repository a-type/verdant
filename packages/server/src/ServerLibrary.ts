import {
	AckMessage,
	applyOperations,
	ClientMessage,
	DocumentBaseline,
	HeartbeatMessage,
	omit,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	ReplicaType,
	SyncMessage,
	isObjectRef,
	FileRef,
	ObjectIdentifier,
	Ref,
	isFileRef,
	SyncAckMessage,
	EventSubscriber,
} from '@verdant-web/common';
import { Database } from 'better-sqlite3';
import { ReplicaInfos } from './Replicas.js';
import { MessageSender } from './MessageSender.js';
import { OperationHistory } from './OperationHistory.js';
import { Baselines } from './Baselines.js';
import { Presence } from './Presence.js';
import { UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import { FileMetadata } from './files/FileMetadata.js';
import { FileStorage } from './files/FileStorage.js';
import { OperationSpec } from './types.js';

export type ServerLibraryEvents = {
	changes: (
		info: TokenInfo,
		operations: Operation[],
		baselines: DocumentBaseline[],
	) => void;
};

export class ServerLibrary extends EventSubscriber<ServerLibraryEvents> {
	private db;
	private sender;
	private profiles;
	private replicas;
	private operations;
	private baselines;
	private presences = new Presence();
	private disableRebasing: boolean;
	private files;
	private fileStorage: FileStorage | undefined;

	private log: (...args: any[]) => void;
	constructor({
		db,
		sender,
		profiles,
		replicaTruancyMinutes,
		log = () => {},
		disableRebasing,
		fileMetadata,
		fileStorage,
	}: {
		db: Database;
		sender: MessageSender;
		profiles: UserProfileLoader<any>;
		replicaTruancyMinutes: number;
		log?: (...args: any[]) => void;
		disableRebasing?: boolean;
		fileMetadata: FileMetadata;
		fileStorage?: FileStorage;
	}) {
		super();

		this.db = db;
		this.log = log;
		this.disableRebasing = !!disableRebasing;
		this.sender = sender;
		this.profiles = profiles;
		this.replicas = new ReplicaInfos(this.db, replicaTruancyMinutes);
		this.operations = new OperationHistory(this.db);
		this.baselines = new Baselines(this.db);
		this.files = fileMetadata;
		this.fileStorage = fileStorage;
		this.presences.on('lost', this.onPresenceLost);
	}

	/**
	 * Validates a user's access to a replica. If the replica does not
	 * exist, a user may create it. But if it does exist, its user (clientId)
	 * must match the user making the request.
	 */
	private validateReplicaAccess = (replicaId: string, info: TokenInfo) => {
		const replica = this.replicas.get(info.libraryId, replicaId);
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
				this.handleHeartbeat(message, clientKey, info);
				break;
			case 'presence-update':
				await this.handlePresenceUpdate(message, clientKey, info);
				break;
			default:
				this.log('Unknown message type', (message as any).type);
				break;
		}
		this.replicas.updateLastSeen(info.libraryId, message.replicaId);
	};

	remove = (libraryId: string, replicaId: string) => {
		this.presences.removeReplica(libraryId, replicaId);
	};

	private handleOperation = (
		message: OperationMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		if (!message.operations.length) return;

		if (!this.hasWriteAccess(info)) {
			this.sender.send(info.libraryId, clientKey, {
				type: 'forbidden',
			});
			return;
		}

		const run = this.db.transaction(() => {
			// insert patches into history
			this.operations.insertAll(
				info.libraryId,
				message.replicaId,
				message.operations,
			);
		});

		run();

		this.enqueueRebase(info.libraryId);

		// rebroadcast to whole library except the sender
		this.rebroadcastOperations(
			info.libraryId,
			clientKey,
			message.replicaId,
			message.operations,
			[],
		);

		// tell sender we got and processed their operation
		this.sender.send(info.libraryId, clientKey, {
			type: 'server-ack',
			timestamp: message.timestamp,
		});

		this.updateHighwater(
			message.replicaId,
			message.operations[message.operations.length - 1].timestamp,
			info,
		);

		this.emit(`changes`, info, message.operations, []);
	};

	private removeExtraOperationData = (operation: OperationSpec): Operation => {
		return omit(operation, ['replicaId', 'serverOrder']);
	};

	private rebroadcastOperations = (
		libraryId: string,
		clientKey: string,
		replicaId: string,
		ops: Operation[],
		baselines: DocumentBaseline[],
	) => {
		if (ops.length === 0 && baselines.length === 0) return;

		this.log(
			'info',
			'Rebroadcasting',
			ops.length,
			'operations and',
			baselines.length,
			'baselines',
		);

		this.sender.broadcast(
			libraryId,
			{
				type: 'op-re',
				operations: ops,
				baselines,
				replicaId,
				globalAckTimestamp: this.replicas.getGlobalAck(libraryId),
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

		// TODO: is this right? shouldn't read-only replicas still be able to sync,
		// just not send ops?
		if (!this.hasWriteAccess(info)) {
			this.sender.send(info.libraryId, clientKey, {
				type: 'forbidden',
			});
			this.log('warning', 'sync from read-only replica', replicaId);
			return;
		}

		if (message.resyncAll) {
			// forget our local understanding of the replica and reset it
			this.replicas.delete(info.libraryId, replicaId);
		}

		const { status, replicaInfo: clientReplicaInfo } =
			this.replicas.getOrCreate(info.libraryId, replicaId, info);

		const changesSince =
			status === 'existing' ? clientReplicaInfo.ackedLogicalTime : null;
		this.log(
			`Sync from ${replicaId} (user: ${info.userId}) [ackedLogicalTime: ${changesSince}, ackedServerOrder: ${clientReplicaInfo.ackedServerOrder}, status: ${status}}]`,
		);

		// lookup operations after the last ack the client gave us
		const ops = this.operations.getFromServerOrder(
			info.libraryId,
			clientReplicaInfo.ackedServerOrder,
		);

		// new, unseen replicas should reset their existing storage
		// to that of the server when joining a library.
		// truant replicas should also reset their storage.
		const replicaShouldReset = !!message.resyncAll || status !== 'existing';

		// TODO: assumption: only new replicas need baselines
		// const baselines = replicaShouldReset
		// 	? []
		// 	: this.baselines.getAllAfter(info.libraryId, changesSince);
		const baselines = this.baselines.getAllAfter(info.libraryId, changesSince);

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

		let overwriteLocalData = replicaShouldReset && !isEmptyLibrary;

		// if the local library is empty and the replica is new to us,
		// but the replica is providing a "since" timestamp, this
		// suggests the local data is incomplete or gone. we request
		// this replica should respond with a full history.
		if (isEmptyLibrary && status === 'new' && message.since !== null) {
			this.log(
				'Detected local data is incomplete, requesting full history from replica',
				replicaId,
			);
			this.sender.send(info.libraryId, clientKey, {
				type: 'need-since',
				since: null,
			});
			return;
		} else if (!isEmptyLibrary && message.since === null) {
			// this would mean the replica is providing a full history
			// but the library already has data. the replica should
			// reset to the server version
			this.log(
				'Detected replica',
				replicaId,
				'is providing a full history but the library already has data. Requesting replica reset.',
			);
			overwriteLocalData = true;
		}

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
			this.baselines.insertAll(info.libraryId, message.baselines);

			this.log(
				'Storing',
				message.baselines.length,
				'baselines and',
				message.operations.length,
				'operations',
			);
			this.operations.insertAll(info.libraryId, replicaId, message.operations);
			this.replicas.updateAcknowledged(
				info.libraryId,
				replicaId,
				message.timestamp,
			);
			// will include the new global ack
			this.rebroadcastOperations(
				info.libraryId,
				clientKey,
				message.replicaId,
				message.operations,
				message.baselines,
			);
			if (message.operations.length || message.baselines.length) {
				this.emit(`changes`, info, message.operations, message.baselines);
			}
		}

		if (status === 'truant') {
			this.log('A truant replica has reconnected', replicaId);
		}

		// create the nonce by encoding the server order of the last operation
		const ackThisNonce = this.createAckNonce(ops);

		// respond to client

		this.log(
			'Sending sync response with',
			ops.length,
			'operations and',
			baselines.length,
			'baselines',
		);
		this.sender.send(info.libraryId, clientKey, {
			type: 'sync-resp',
			operations: ops.map(this.removeExtraOperationData),
			baselines: baselines.map((baseline) => ({
				oid: baseline.oid,
				snapshot: baseline.snapshot,
				timestamp: baseline.timestamp,
			})),
			globalAckTimestamp: this.replicas.getGlobalAck(info.libraryId),
			peerPresence: this.presences.all(info.libraryId),
			// only request the client to overwrite local data if a reset is requested
			// and there is data to overwrite it. otherwise the client may still
			// send its own history to us.
			overwriteLocalData,
			ackedTimestamp: message.timestamp,
			ackThisNonce,
		});
	};

	private createAckNonce = (ops: OperationSpec[]): string | undefined => {
		return ops.length
			? Buffer.from(JSON.stringify(ops[ops.length - 1].serverOrder)).toString(
					'base64',
			  )
			: undefined;
	};

	private handleAck = (
		message: AckMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		if (message.nonce) {
			const decodedNonce = JSON.parse(
				Buffer.from(message.nonce, 'base64').toString('utf8'),
			);
			this.log(
				'Ack from',
				message.replicaId,
				'(user',
				info.userId,
				')',
				'with order',
				decodedNonce,
			);
			if (typeof decodedNonce !== 'number') {
				this.log('error', 'Invalid nonce', message.nonce);
				return;
			}

			const replicaId = message.replicaId;
			this.replicas.updateServerOrder(info.libraryId, replicaId, decodedNonce);
		} else if (message.timestamp) {
			this.replicas.acknowledgeOperation(
				info.libraryId,
				message.replicaId,
				message.timestamp,
			);
			const globalAck = this.replicas.getGlobalAck(info.libraryId);
			if (globalAck) {
				this.sender.broadcast(info.libraryId, {
					type: 'global-ack',
					timestamp: globalAck,
				});
			}
		}
	};

	private updateHighwater = (
		replicaId: string,
		timestamp: string,
		info: TokenInfo,
		ignoreClientKeys: string[] = [],
	) => {
		this.replicas.updateAcknowledged(info.libraryId, replicaId, timestamp);
		const newGlobalAck = this.replicas.getGlobalAck(info.libraryId);
		if (newGlobalAck) {
			this.sender.broadcast(
				info.libraryId,
				{
					type: 'global-ack',
					timestamp: newGlobalAck,
				},
				ignoreClientKeys,
			);
		}
	};

	private pendingRebaseTimeout: NodeJS.Timeout | null = null;
	private enqueueRebase = (libraryId: string) => {
		if (this.disableRebasing) return;

		if (!this.pendingRebaseTimeout) {
			setTimeout(() => this.rebase(libraryId), 0);
		}
	};

	private rebase = (libraryId: string) => {
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
		const activeReplicaIds = Object.values(this.presences.all(libraryId)).map(
			(p) => p.replicaId,
		);
		const globalAck = this.replicas.getGlobalAck(libraryId, activeReplicaIds);

		if (!globalAck) {
			this.log('No global ack, skipping rebase');
			return;
		}

		// these are in forward chronological order
		const ops = this.operations.getBefore(libraryId, globalAck);

		const opsToApply: Record<string, OperationSpec[]> = {};
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

		const deletedRefs = new Array<Ref>();
		for (const [documentId, ops] of Object.entries(opsToApply)) {
			this.log('Rebasing', documentId);
			this.baselines.applyOperations(libraryId, documentId, ops, deletedRefs),
				this.operations.dropAll(libraryId, ops);
		}

		// hint to clients they can rebase too
		this.sender.broadcast(libraryId, {
			type: 'global-ack',
			timestamp: globalAck,
		});

		// cleanup deleted files
		for (const ref of deletedRefs) {
			if (isFileRef(ref)) {
				this.files.markPendingDelete(libraryId, ref.id);
			}
		}
	};

	private handleHeartbeat = (
		_: HeartbeatMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.sender.send(info.libraryId, clientKey, {
			type: 'heartbeat-response',
		});
	};

	private handlePresenceUpdate = async (
		message: PresenceUpdateMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.presences.set(info.libraryId, info.userId, {
			presence: message.presence,
			replicaId: message.replicaId,
			profile: await this.profiles.get(info.userId),
			id: info.userId,
		});
		this.sender.broadcast(
			info.libraryId,
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

	private onPresenceLost = async (
		libraryId: string,
		replicaId: string,
		userId: string,
	) => {
		this.log('User disconnected from all replicas:', userId);
		this.sender.broadcast(libraryId, {
			type: 'presence-offline',
			replicaId,
			userId,
		});
		if (Object.keys(this.presences.all(libraryId)).length === 0) {
			this.log(`All users have disconnected from ${libraryId}`);
			// could happen - if the server is shutting down manually
			if (!this.db.open) {
				this.log('debug', 'Database not open, skipping cleanup');
				return;
			}
			const pendingDelete = this.files.getPendingDeletes(libraryId);
			if (pendingDelete.length > 0) {
				if (!this.fileStorage) {
					throw new Error('File storage not configured, cannot delete files');
				}
				this.log(
					'Deleting files:',
					pendingDelete.map((f) => f.fileId).join(', '),
				);
				await Promise.all(
					pendingDelete.map(async (fileInfo) => {
						try {
							await this.fileStorage?.delete({
								libraryId: fileInfo.libraryId,
								fileName: fileInfo.name,
								id: fileInfo.fileId,
								type: fileInfo.type,
							});
							this.files.delete(libraryId, fileInfo.fileId);
						} catch (e) {
							this.log(
								'Failed to delete file',
								fileInfo.fileId,
								' the file will remain in a pending delete state',
								e,
							);
						}
					}),
				);
			}
		}
	};

	destroy = async (libraryId: string) => {
		this.presences.clear(libraryId);
		this.replicas.deleteAll(libraryId);
		this.operations.deleteAll(libraryId);
		this.baselines.deleteAll(libraryId);
		const allFiles = this.files.getAll(libraryId);
		if (allFiles.length > 0) {
			this.log(
				`Deleting ${allFiles.length} files for library ${libraryId}`,
				allFiles.map((f) => f.fileId).join(', '),
			);
			for (const fileInfo of allFiles) {
				await this.fileStorage?.delete({
					libraryId,
					fileName: fileInfo.name,
					id: fileInfo.fileId,
					type: fileInfo.type,
				});
			}
			this.files.deleteAll(libraryId);
		}
	};

	getPresence = (libraryId: string) => {
		return this.presences.all(libraryId);
	};

	evictUser = (libraryId: string, userId: string) => {
		this.replicas.deleteAllForUser(libraryId, userId);
	};

	getDocumentSnapshot = (libraryId: string, oid: string) => {
		return this.hydrateObject(libraryId, oid);
	};

	private getObjectSnapshot = (libraryId: string, oid: string) => {
		const baseline = this.baselines.get(libraryId, oid);
		const ops = this.operations.getAllFor(libraryId, oid);
		const snapshot = applyOperations(baseline?.snapshot ?? undefined, ops);
		return snapshot;
	};

	private hydrateObject = (libraryId: string, oid: string): any => {
		const snapshot = this.getObjectSnapshot(libraryId, oid);
		if (Array.isArray(snapshot)) {
			return snapshot.map((item, index) => {
				if (isObjectRef(item)) {
					return this.hydrateObject(libraryId, item.id);
				} else if (isFileRef(item)) {
					return this.hydrateFile(libraryId, item.id);
				} else {
					return item;
				}
			});
		} else if (snapshot && typeof snapshot === 'object') {
			const hydrated = { ...snapshot };
			for (const [key, value] of Object.entries(snapshot)) {
				if (isObjectRef(value)) {
					hydrated[key] = this.hydrateObject(libraryId, value.id);
				} else if (isFileRef(value)) {
					hydrated[key] = this.hydrateFile(libraryId, value.id);
				}
			}
			return hydrated;
		} else {
			return snapshot;
		}
	};

	private hydrateFile = (libraryId: string, fileId: string) => {
		const data = this.files.get(libraryId, fileId);
		if (data) {
			const url =
				this.fileStorage?.getUrl({
					fileName: data.name,
					id: data.fileId,
					libraryId,
					type: data.type,
				}) ?? null;

			return {
				url,
				id: data.fileId,
				name: data.name,
				type: data.type,
			};
		} else {
			return null;
		}
	};

	close = () => {
		this.db.close();
	};
}
