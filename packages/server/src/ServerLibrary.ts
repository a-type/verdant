import {
	AckMessage,
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	HeartbeatMessage,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	Ref,
	ReplicaType,
	SyncMessage,
	applyOperations,
	isFileRef,
	isObjectRef,
	rewriteAuthzOriginator,
} from '@verdant-web/common';
import { MessageSender } from './MessageSender.js';
import { Presence } from './Presence.js';
import { UserProfileLoader } from './Profiles.js';
import { TokenInfo } from './TokenVerifier.js';
import { FileStorage } from './files/FileStorage.js';
import { Storage } from './storage/Storage.js';
import {
	LibraryInfo,
	StoredDocumentBaseline,
	StoredOperation,
} from './types.js';

export type ServerLibraryEvents = {
	changes: (
		info: TokenInfo,
		operations: Operation[],
		baselines: DocumentBaseline[],
	) => void;
};

export class ServerLibrary extends EventSubscriber<ServerLibraryEvents> {
	private storage;
	private sender;
	private profiles;
	private presences;
	private disableRebasing: boolean;
	private fileStorage: FileStorage | undefined;

	private log: (...args: any[]) => void;
	constructor({
		storage,
		sender,
		profiles,
		log = () => {},
		disableRebasing,
		fileStorage,
	}: {
		storage: Storage;
		sender: MessageSender;
		profiles: UserProfileLoader<any>;
		log?: (...args: any[]) => void;
		disableRebasing?: boolean;
		fileStorage?: FileStorage;
	}) {
		super();

		this.log = log;
		this.disableRebasing = !!disableRebasing;
		this.sender = sender;
		this.profiles = profiles;
		this.presences = new Presence(profiles);
		this.storage = storage;
		this.fileStorage = fileStorage;
		this.presences.on('lost', this.onPresenceLost);
	}

	/**
	 * Validates a user's access to a replica. If the replica does not
	 * exist, a user may create it. But if it does exist, its user (clientId)
	 * must match the user making the request.
	 */
	private validateReplicaAccess = async (
		replicaId: string,
		clientKey: string,
		info: TokenInfo,
	) => {
		const replica = await this.storage.replicas.get(info.libraryId, replicaId);
		if (replica && replica.clientId !== info.userId) {
			this.sender.send(info.libraryId, clientKey, {
				type: 'forbidden',
			});
			return false;
		}
		return true;
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
		await this.storage.ready;

		const allowed = await this.validateReplicaAccess(
			message.replicaId,
			clientKey,
			info,
		);
		if (!allowed) return;

		switch (message.type) {
			case 'op':
				await this.handleOperation(message, clientKey, info);
				break;
			case 'sync':
				await this.handleSync(message, clientKey, info);
				break;
			case 'ack':
				await this.handleAck(message, clientKey, info);
				break;
			case 'heartbeat':
				await this.handleHeartbeat(message, clientKey, info);
				break;
			case 'presence-update':
				await this.handlePresenceUpdate(message, clientKey, info);
				break;
			default:
				this.log('Unknown message type', (message as any).type);
				break;
		}
		// a bit fragile - skipping presence-update since currently
		// it's delivered before sync. in which case, sync always
		// sees a recent last seen for the replica even if it was
		// truant before the presence-update.
		if (message.type !== 'presence-update') {
			await this.storage.replicas.updateLastSeen(
				info.libraryId,
				message.replicaId,
			);
		}
	};

	remove = (libraryId: string, replicaId: string) => {
		this.presences.removeReplica(libraryId, replicaId);
	};

	private handleOperation = async (
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

		// rebroadcast to whole library except the sender
		this.rebroadcastOperations(
			info.libraryId,
			clientKey,
			message.replicaId,
			message.operations,
		);

		// TODO: can we defer this and rebroadcast in parallel?
		// insert patches into history
		await this.storage.operations.insertAll(
			info.libraryId,
			message.replicaId,
			message.operations,
		);

		this.enqueueRebase(info.libraryId);

		// tell sender we got and processed their operation
		this.sender.send(info.libraryId, clientKey, {
			type: 'server-ack',
			timestamp: message.timestamp,
		});

		await this.updateHighwater(
			message.replicaId,
			message.operations[message.operations.length - 1].timestamp,
			info,
		);

		this.emit(`changes`, info, message.operations, []);
	};

	private rebroadcastOperations = async (
		libraryId: string,
		clientKey: string,
		replicaId: string,
		ops: Operation[],
		baselines?: DocumentBaseline[],
	) => {
		if (ops.length === 0 && !baselines?.length) return;

		this.log(
			'info',
			'Rebroadcasting',
			ops.length,
			'operations',
			baselines?.length ?? 0,
			'baselines',
		);

		this.sender.broadcast(
			libraryId,
			{
				type: 'op-re',
				operations: ops,
				baselines,
				replicaId,
				globalAckTimestamp:
					(await this.storage.replicas.getGlobalAck(libraryId)) ?? undefined,
			},
			[clientKey],
		);
	};

	private handleSync = async (
		message: SyncMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		const replicaId = message.replicaId;

		// TODO: is this the right way to do this? should it just ignore
		// read-only changes?
		if (
			!this.hasWriteAccess(info) &&
			(message.operations.length > 0 || message.baselines.length > 0)
		) {
			this.sender.send(info.libraryId, clientKey, {
				type: 'forbidden',
			});
			this.log('warn', 'sync with changes from read-only replica', replicaId);
			return;
		}

		if (message.resyncAll) {
			// forget our local understanding of the replica and reset it
			await this.storage.replicas.delete(info.libraryId, replicaId);
		}

		const { status, replicaInfo: clientReplicaInfo } =
			await this.storage.replicas.getOrCreate(info.libraryId, replicaId, info);

		this.log(
			'info',
			`Sync from ${replicaId} (user: ${info.userId}) [ackedServerOrder: ${clientReplicaInfo.ackedServerOrder}, status: ${status}}]`,
		);

		// for truant replicas -- if their ackedServerOrder is up-to-date, that's fine,
		// restore them.
		let overrideTruant = false;
		if (status === 'truant') {
			const latestServerOrder =
				await this.storage.operations.getLatestServerOrder(info.libraryId);
			if (clientReplicaInfo.ackedServerOrder >= latestServerOrder) {
				overrideTruant = true;
			}
		}

		// lookup operations after the last ack the client gave us
		const ops = await this.storage.operations.getAfterServerOrder(
			info.libraryId,
			clientReplicaInfo.ackedServerOrder,
		);

		// new, unseen replicas should reset their existing storage
		// to that of the server when joining a library.
		// truant replicas should also reset their storage.
		const replicaShouldReset =
			!!message.resyncAll || (!overrideTruant && status !== 'existing');

		// only new replicas need baselines. by definition, a rebase only
		// happens when all active replicas agree on history. every client
		// replica will generate the same baseline locally, so it
		// doesn't need to receive it from the server.
		const baselines = replicaShouldReset
			? await this.storage.baselines.getAll(info.libraryId)
			: [];

		// We detect that a library is new by checking if it has any history.
		// If there are no existing operations or baselines (and the requested
		// history timerange was "everything", i.e. "from server order 0"), then this is
		// a fresh library which should receive the first client's history as its
		// own. Otherwise, if the client requested a reset, we should send them
		// the full history of the library.
		// the definition of this field could be improved to be more explicit
		// and not rely on seemingly unrelated data.
		const isEmptyLibrary =
			clientReplicaInfo.ackedServerOrder === 0 &&
			ops.length === 0 &&
			baselines.length === 0;
		if (isEmptyLibrary) {
			this.log('info', 'Received sync from new library', replicaId);

			// when initializing a new library, rewrite authz subjects to
			// the current user ID (on a purely local replica, these authz
			// subjects will be a generic "originator" constant value, because
			// it doesnt know what user it is until it connects to the server)
			rewriteAuthzOriginator(message, info.userId);
		}

		// don't reset replica if library is empty...
		let overwriteReplicaData = replicaShouldReset && !isEmptyLibrary;

		// if the local library is empty and the replica is new to us,
		// but the replica is providing a "since" timestamp, this
		// suggests the local data is incomplete or gone. we request
		// this replica should respond with a full history.
		if (isEmptyLibrary && status === 'new' && message.since !== null) {
			this.log(
				'info',
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
				'warn',
				'Detected replica',
				replicaId,
				'is providing a full history but the library already has data. Requesting replica reset.',
			);
			overwriteReplicaData = true;
		}

		if (overwriteReplicaData) {
			this.log(
				'info',
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
		if (!overwriteReplicaData) {
			// store all incoming operations and baselines
			await this.storage.baselines.insertAll(info.libraryId, message.baselines);

			this.log(
				'debug',
				'Storing',
				message.baselines.length,
				'baselines and',
				message.operations.length,
				'operations',
			);
			await this.storage.operations.insertAll(
				info.libraryId,
				replicaId,
				message.operations,
			);
			await this.storage.replicas.updateAcknowledgedLogicalTime(
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
				// we only need to broadcast baselines if we just initialized
				// this library, if any other clients (with empty libraries)
				// are listening for initial data, too. this happens in
				// rebasing.test.ts, for example.
				isEmptyLibrary ? message.baselines : undefined,
			);
			if (message.operations.length || message.baselines.length) {
				this.emit(`changes`, info, message.operations, message.baselines);
			}
		}

		if (status === 'truant') {
			this.log('info', 'A truant replica has reconnected', replicaId);
		}

		// create the nonce by encoding the server order of the last operation
		const ackThisNonce = this.createAckNonce(ops);

		// respond to client

		this.log(
			'info',
			'Sending sync response with',
			ops.length,
			'operations and',
			baselines.length,
			'baselines',
		);

		// mutating baselines/operations to remove extra data -
		// mutating just to save on allocations here.

		this.sender.send(info.libraryId, clientKey, {
			type: 'sync-resp',
			operations: this.removeOperationExtras(ops),
			baselines: this.removeBaselineExtras(baselines),
			globalAckTimestamp:
				(await this.storage.replicas.getGlobalAck(info.libraryId)) ?? undefined,
			peerPresence: this.presences.all(info.libraryId),
			// only request the client to overwrite local data if a reset is requested
			// and there is data to overwrite it. otherwise the client may still
			// send its own history to us.
			overwriteLocalData: overwriteReplicaData,
			ackedTimestamp: message.timestamp,
			ackThisNonce,
		});
	};

	private createAckNonce = (ops: StoredOperation[]): string | undefined => {
		return ops.length
			? Buffer.from(JSON.stringify(ops[ops.length - 1].serverOrder)).toString(
					'base64',
			  )
			: undefined;
	};

	private handleAck = async (
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
			await this.storage.replicas.updateAckedServerOrder(
				info.libraryId,
				replicaId,
				decodedNonce,
			);
		} else if (message.timestamp) {
			await this.storage.replicas.acknowledgeOperation(
				info.libraryId,
				message.replicaId,
				message.timestamp,
			);
			const globalAck = await this.storage.replicas.getGlobalAck(
				info.libraryId,
			);
			if (globalAck) {
				this.sender.broadcast(info.libraryId, {
					type: 'global-ack',
					timestamp: globalAck,
				});
			}
		}
	};

	private updateHighwater = async (
		replicaId: string,
		timestamp: string,
		info: TokenInfo,
		ignoreClientKeys: string[] = [],
	) => {
		await this.storage.replicas.updateAcknowledgedLogicalTime(
			info.libraryId,
			replicaId,
			timestamp,
		);
		const newGlobalAck = await this.storage.replicas.getGlobalAck(
			info.libraryId,
		);
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

	private rebase = async (libraryId: string) => {
		if (this.disableRebasing) return;

		this.log('debug', 'Performing rebase check');

		// fundamentally a rebase occurs when some conditions are met:
		// 1. the replica which created an operation has dropped that operation
		//    from their history stack, i.e. their oldest acked timestamp is after it.
		// 2. all other replicas have acknowledged an operation since the
		//    operation which will be flattened to the baseline. i.e. global
		//    ack server order > server order.
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
		const globalAck = await this.storage.replicas.getGlobalAck(
			libraryId,
			activeReplicaIds,
		);
		const globalServerOrder =
			await this.storage.replicas.getEarliestAckedServerOrder(libraryId);

		if (!globalAck) {
			this.log('debug', 'No global ack, skipping rebase');
			return;
		}

		if (globalServerOrder === null) {
			this.log('debug', 'No global server order, skipping rebase');
			return;
		}

		// these are in forward chronological order
		const ops = await this.storage.operations.getBeforeServerOrder(
			libraryId,
			globalServerOrder,
		);

		const opsToApply: Record<string, StoredOperation[]> = {};
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
			await this.storage.baselines.applyOperations(
				libraryId,
				documentId,
				ops,
				deletedRefs,
			);
			await this.storage.operations.delete(libraryId, ops);
		}

		// hint to clients they can rebase too
		this.sender.broadcast(libraryId, {
			type: 'global-ack',
			timestamp: globalAck,
		});

		// cleanup deleted files
		await Promise.all(
			deletedRefs
				.filter(isFileRef)
				.map((ref) =>
					this.storage.fileMetadata.markPendingDelete(libraryId, ref.id),
				),
		);
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
		const updated = await this.presences.set(info.libraryId, info.userId, {
			presence: message.presence,
			internal: message.internal,
			replicaId: message.replicaId,
			id: info.userId,
		});
		this.sender.broadcast(
			info.libraryId,
			{
				type: 'presence-changed',
				replicaId: message.replicaId,
				userInfo: updated,
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
		this.log('info', 'User disconnected from all replicas:', userId);
		this.sender.broadcast(libraryId, {
			type: 'presence-offline',
			replicaId,
			userId,
		});
		if (Object.keys(this.presences.all(libraryId)).length === 0) {
			this.log('info', `All users have disconnected from ${libraryId}`);
			// could happen - if the server is shutting down manually
			if (!this.storage.open) {
				this.log('debug', 'Database not open, skipping cleanup');
				return;
			}
			const pendingDelete = await this.storage.fileMetadata.getPendingDelete(
				libraryId,
			);
			if (pendingDelete.length > 0) {
				if (!this.fileStorage) {
					throw new Error('File storage not configured, cannot delete files');
				}
				this.log(
					'info',
					'Deleting files:',
					pendingDelete.map((f) => f.fileId).join(', '),
				);
				await Promise.all(
					pendingDelete.map(async (fileInfo): Promise<void> => {
						try {
							await this.fileStorage?.delete({
								libraryId: fileInfo.libraryId,
								fileName: fileInfo.name,
								id: fileInfo.fileId,
								type: fileInfo.type,
							});
							this.storage.fileMetadata.delete(libraryId, fileInfo.fileId);
						} catch (e) {
							this.log(
								'error',
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
		this.log('info', 'Destroying library', libraryId);
		this.presences.clear(libraryId);
		await Promise.all([
			this.storage.replicas.deleteAll(libraryId),
			this.storage.operations.deleteAll(libraryId),
			this.storage.baselines.deleteAll(libraryId),
		]);
		const allFiles = await this.storage.fileMetadata.getAll(libraryId);
		if (allFiles.length > 0) {
			this.log(
				'info',
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
			await this.storage.fileMetadata.deleteAll(libraryId);
		}
	};

	getPresence = (libraryId: string) => {
		return this.presences.all(libraryId);
	};

	getInfo = async (libraryId: string): Promise<LibraryInfo | null> => {
		const rawReplicas = await this.storage.replicas.getAll(libraryId);
		const profiles = await Promise.all(
			rawReplicas.map((r) => this.profiles.get(r.clientId)),
		);
		const replicas = rawReplicas.map((r, index) => ({
			id: r.id,
			ackedLogicalTime: r.ackedLogicalTime,
			ackedServerOrder: r.ackedServerOrder,
			type: r.type,
			truant:
				!!r.lastSeenWallClockTime &&
				r.lastSeenWallClockTime < this.storage.replicas.truantCutoff,
			profile: profiles[index],
		}));

		const data = {
			id: libraryId,
			replicas,
			latestServerOrder: await this.storage.operations.getLatestServerOrder(
				libraryId,
			),
			operationsCount: await this.storage.operations.getCount(libraryId),
			baselinesCount: await this.storage.baselines.getCount(libraryId),
			globalAck: (await this.storage.replicas.getGlobalAck(libraryId)) ?? null,
		};

		if (
			data.replicas.length === 0 &&
			data.operationsCount === 0 &&
			data.baselinesCount === 0
		) {
			return null;
		}

		return data;
	};

	evictUser = async (libraryId: string, userId: string) => {
		await this.storage.replicas.deleteAllForUser(libraryId, userId);
	};

	getDocumentSnapshot = (libraryId: string, oid: string) => {
		return this.hydrateObject(libraryId, oid);
	};

	private getObjectSnapshot = async (libraryId: string, oid: string) => {
		const [baseline, ops] = await Promise.all([
			this.storage.baselines.get(libraryId, oid),
			this.storage.operations.getAll(libraryId, oid),
		]);
		const snapshot = applyOperations(baseline?.snapshot ?? undefined, ops);
		return snapshot;
	};

	private hydrateObject = async (
		libraryId: string,
		oid: string,
	): Promise<any> => {
		const snapshot = await this.getObjectSnapshot(libraryId, oid);
		if (Array.isArray(snapshot)) {
			return Promise.all(
				snapshot.map(async (item: any) => {
					if (isObjectRef(item)) {
						return this.hydrateObject(libraryId, item.id);
					} else if (isFileRef(item)) {
						return this.hydrateFile(libraryId, item.id);
					} else {
						return item;
					}
				}),
			);
		} else if (snapshot && typeof snapshot === 'object') {
			const hydrated = { ...snapshot };
			await Promise.all(
				Object.entries(snapshot).map(async ([key, value]) => {
					if (isObjectRef(value)) {
						hydrated[key] = await this.hydrateObject(libraryId, value.id);
					} else if (isFileRef(value)) {
						hydrated[key] = await this.hydrateFile(libraryId, value.id);
					}
				}),
			);
			return hydrated;
		} else {
			return snapshot;
		}
	};

	private hydrateFile = async (libraryId: string, fileId: string) => {
		const data = await this.storage.fileMetadata.get(libraryId, fileId);
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

	// MUTATES DATA. ONLY USE WHEN RETURNING DATA TO CLIENT WHICH WILL OTHERWISE
	// NOT BE REFERENCED.
	private removeBaselineExtras = (
		baselines: StoredDocumentBaseline[],
	): DocumentBaseline[] => {
		for (const baseline of baselines) {
			// @ts-expect-error
			delete baseline.libraryId;
		}
		return baselines as unknown as DocumentBaseline[];
	};

	// MUTATES DATA. ONLY USE WHEN RETURNING DATA TO CLIENT WHICH WILL OTHERWISE
	// NOT BE REFERENCED.
	private removeOperationExtras = (
		operations: StoredOperation[],
	): Operation[] => {
		for (const operation of operations) {
			// @ts-expect-error
			delete operation.libraryId;
			// @ts-expect-error
			delete operation.replicaId;
			// @ts-expect-error
			delete operation.serverOrder;
		}
		return operations as unknown as Operation[];
	};
}
