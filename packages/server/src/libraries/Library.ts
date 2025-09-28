import {
	AckMessage,
	applyOperations,
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	HeartbeatMessage,
	isFileRef,
	isObjectRef,
	Operation,
	OperationMessage,
	PresenceUpdateMessage,
	Ref,
	ReplicaType,
	rewriteAuthzOriginator,
	SyncMessage,
} from '@verdant-web/common';
import { MessageSender } from '../connections/MessageSender.js';
import { Presence } from '../connections/Presence.js';
import { FileInfo, FileStorageLibraryDelegate } from '../files/FileStorage.js';
import { Logger } from '../logger.js';
import { Storage } from '../storage/Storage.js';
import { TokenInfo } from '../TokenVerifier.js';
import {
	LibraryInfo,
	StoredDocumentBaseline,
	StoredOperation,
	StoredReplicaInfo,
} from '../types.js';

export type LibraryEvents = {
	changes: (
		info: TokenInfo,
		operations: Operation[],
		baselines: DocumentBaseline[],
	) => void;
};

export interface LibraryFileInfo {
	id: string;
	name: string;
	type: string;
	url: string | null;
	libraryId: string;
}

export interface ILibrary {
	handleMessage: (
		message: ClientMessage,
		clientKey: string,
		info: TokenInfo,
	) => Promise<void>;
	destroy: () => Promise<void>;
	getPresence: (userId: string) => Promise<any>;
	getInfo: () => Promise<LibraryInfo | null>;
	evictUser: (userId: string) => Promise<void>;
	getDocumentSnapshot: (oid: string) => Promise<any>;
	getFileInfo: (fileId: string) => Promise<LibraryFileInfo | null>;
	putFileInfo: (info: FileInfo) => Promise<void>;
}

export class Library implements ILibrary {
	private storage;
	private sender;
	private disableRebasing: boolean;
	private fileStorage;
	private events;
	private id: string;
	private presence: Presence;

	private log: Logger;

	constructor({
		storage,
		sender,
		log = () => {},
		disableRebasing,
		fileStorage,
		events,
		id,
		presence,
	}: {
		storage: Storage;
		sender: MessageSender;
		log?: Logger;
		disableRebasing?: boolean;
		fileStorage?: FileStorageLibraryDelegate;
		events?: EventSubscriber<LibraryEvents>;
		id: string;
		presence: Presence;
	}) {
		this.id = id;
		this.storage = storage;
		this.sender = sender;
		this.log = log;
		this.disableRebasing = !!disableRebasing;
		this.fileStorage = fileStorage;
		this.events = events;
		this.presence = presence;
		this.presence.subscribe('lost', this.onPresenceLost);
	}

	private validateReplicaAccess = async (
		replicaId: string,
		clientKey: string,
		info: TokenInfo,
	) => {
		const replica = await this.storage.replicas.get(replicaId);
		if (replica && replica.clientId !== info.userId) {
			this.sender.respond(clientKey, {
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

	handleMessage = async (
		message: ClientMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		if (message.type === 'heartbeat') {
			this.handleHeartbeat(message, clientKey, info);
			return;
		}

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
			case 'presence-update':
				await this.handlePresenceUpdate(message, clientKey, info);
				break;
			default:
				this.log('error', 'Unknown message type', (message as any).type);
				break;
		}
		// a bit fragile - skipping presence-update since currently
		// it's delivered before sync. in which case, sync always
		// sees a recent last seen for the replica even if it was
		// truant before the presence-update.
		if (message.type !== 'presence-update') {
			await this.storage.replicas.updateLastSeen(message.replicaId);
		}
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
			{
				type: 'op-re',
				operations: ops,
				baselines,
				replicaId,
				globalAckTimestamp:
					(await this.storage.replicas.getGlobalAck()) ?? undefined,
			},
			[clientKey],
		);
	};

	private handleOperation = async (
		message: OperationMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		if (!message.operations.length) return;

		if (!this.hasWriteAccess(info)) {
			this.sender.respond(clientKey, {
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

		// insert patches into history

		// first, record the replica's serverOrder before insertion.
		const replicaInfo = await this.storage.replicas.getOrCreate(
			message.replicaId,
			{
				userId: info.userId,
				type: info.type,
			},
		);
		const newServerOrder = await this.storage.operations.insertAll(
			message.replicaId,
			message.operations,
		);
		this.preemptiveUpdateServerOrder(
			replicaInfo.replicaInfo,
			newServerOrder,
			message.operations.length,
		);

		this.enqueueRebase();

		// tell sender we got and processed their operation
		this.sender.respond(clientKey, {
			type: 'server-ack',
			timestamp: message.timestamp,
		});

		await this.updateHighwater(
			message.replicaId,
			message.operations[message.operations.length - 1].timestamp,
			info,
		);

		this.events?.emit(`changes`, info, message.operations, []);
	};

	/**
	 * If a replica inserts operations when it's already
	 * up to date, we can preemptively update its ackedServerOrder
	 * to avoid a round trip.
	 */
	private preemptiveUpdateServerOrder = async (
		replicaInfo: StoredReplicaInfo,
		newServerOrder: number,
		insertedOperationsCount: number,
	) => {
		if (
			newServerOrder - replicaInfo.ackedServerOrder ===
			insertedOperationsCount
		) {
			await this.storage.replicas.updateAckedServerOrder(
				replicaInfo.id,
				newServerOrder,
			);
			this.log(
				'debug',
				'Preemptively updated ackedServerOrder for',
				replicaInfo.id,
				'to',
				newServerOrder,
			);
		}
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
			this.sender.respond(clientKey, {
				type: 'forbidden',
			});
			this.log('warn', 'sync with changes from read-only replica', replicaId);
			return;
		}

		if (message.resyncAll) {
			// forget our local understanding of the replica and reset it
			await this.storage.replicas.delete(replicaId);
		}

		const { status, replicaInfo: clientReplicaInfo } =
			await this.storage.replicas.getOrCreate(replicaId, info);

		this.log(
			'info',
			`Sync from ${replicaId} (user: ${info.userId}) [ackedServerOrder: ${clientReplicaInfo.ackedServerOrder}, status: ${status}}]`,
		);

		// for truant replicas -- if their ackedServerOrder is up-to-date, that's fine,
		// restore them.
		let overrideTruant = false;
		if (status === 'truant') {
			const latestServerOrder =
				await this.storage.operations.getLatestServerOrder();
			if (clientReplicaInfo.ackedServerOrder >= latestServerOrder) {
				overrideTruant = true;
				this.log(
					'debug',
					'Overriding truant reset; truant replica has up-to-date server order',
				);
			}
		}

		// lookup operations after the last ack the client gave us
		const ops = await this.storage.operations.getAfterServerOrder(
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
			? await this.storage.baselines.getAll()
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

		// EARLY RETURN --
		// if the local library is empty and the replica is new to us,
		// but the replica is providing a "since" timestamp, this
		// suggests the local data is incomplete or gone. we request
		// this replica should respond with a full history. We will retry
		// sync after replica has updated us with full history.
		if (isEmptyLibrary && status === 'new' && message.since !== null) {
			this.log(
				'info',
				'Detected local data is incomplete, requesting full history from replica',
				replicaId,
			);
			this.sender.respond(clientKey, {
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
			await this.storage.baselines.insertAll(message.baselines);

			this.log(
				'debug',
				'Storing',
				message.baselines.length,
				'baselines and',
				message.operations.length,
				'operations',
			);
			const newServerOrder = await this.storage.operations.insertAll(
				replicaId,
				message.operations,
			);
			this.preemptiveUpdateServerOrder(
				clientReplicaInfo,
				newServerOrder,
				message.operations.length,
			);
			await this.storage.replicas.updateAcknowledgedLogicalTime(
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
				this.events?.emit(
					`changes`,
					info,
					message.operations,
					message.baselines,
				);
			}
		}

		if (status === 'truant') {
			this.log('info', 'A truant replica has reconnected', replicaId);
		}

		// create the nonce by encoding the server order of the last operation
		const serverOrderToAck = ops.length
			? ops[ops.length - 1].serverOrder
			: undefined;
		const ackThisNonce =
			serverOrderToAck !== undefined
				? this.createAckNonce(serverOrderToAck)
				: undefined;

		// respond to client

		this.log(
			'info',
			'Sending sync response with',
			ops.length,
			'operations and',
			baselines.length,
			'baselines',
			'to client key',
			clientKey,
		);

		// mutating baselines/operations to remove extra data -
		// mutating just to save on allocations here.

		try {
			this.sender.respond(clientKey, {
				type: 'sync-resp',
				operations: this.removeOperationExtras(ops),
				baselines: this.removeBaselineExtras(baselines),
				globalAckTimestamp:
					(await this.storage.replicas.getGlobalAck()) ?? undefined,
				peerPresence: this.presence.all(),
				// only request the client to overwrite local data if a reset is requested
				// and there is data to overwrite it. otherwise the client may still
				// send its own history to us.
				overwriteLocalData: overwriteReplicaData,
				ackedTimestamp: message.timestamp,
				ackThisNonce,
			});
		} catch (err) {
			this.log('error', err);
			throw err;
		}
	};

	private createAckNonce = (serverOrder: number): string | undefined => {
		return Buffer.from(JSON.stringify(serverOrder)).toString('base64');
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
				'debug',
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
				replicaId,
				decodedNonce,
			);
		} else if (message.timestamp) {
			await this.storage.replicas.acknowledgeOperation(
				message.replicaId,
				message.timestamp,
			);
			const globalAck = await this.storage.replicas.getGlobalAck();
			if (globalAck) {
				this.sender.broadcast({
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
			replicaId,
			timestamp,
		);
		const newGlobalAck = await this.storage.replicas.getGlobalAck();
		if (newGlobalAck) {
			this.sender.broadcast(
				{
					type: 'global-ack',
					timestamp: newGlobalAck,
				},
				ignoreClientKeys,
			);
		}
	};

	private pendingRebaseTimeout: NodeJS.Timeout | null = null;
	private enqueueRebase = () => {
		if (this.disableRebasing) return;

		if (!this.pendingRebaseTimeout) {
			setTimeout(() => this.rebase(), 0);
		}
	};

	private rebase = async () => {
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
		const activeReplicaIds = Object.values(this.presence.all()).map(
			(p) => p.replicaId,
		);
		const globalAck =
			await this.storage.replicas.getGlobalAck(activeReplicaIds);
		const globalServerOrder =
			await this.storage.replicas.getEarliestAckedServerOrder();

		if (!globalAck) {
			this.log('debug', 'No global ack, skipping rebase');
			return;
		}

		if (globalServerOrder === null) {
			this.log('debug', 'No global server order, skipping rebase');
			return;
		}

		// these are in forward chronological order
		const ops =
			await this.storage.operations.getBeforeServerOrder(globalServerOrder);

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
			this.log('debug', 'Rebasing', documentId);
			await this.storage.baselines.applyOperations(
				documentId,
				ops,
				deletedRefs,
			);
			await this.storage.operations.delete(ops);
		}

		// hint to clients they can rebase too
		this.sender.broadcast({
			type: 'global-ack',
			timestamp: globalAck,
		});

		// cleanup deleted files
		await Promise.all(
			deletedRefs
				.filter(isFileRef)
				.map((ref) => this.storage.fileMetadata.markPendingDelete(ref.id)),
		);
	};

	private handleHeartbeat = (
		_: HeartbeatMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		this.sender.respond(clientKey, {
			type: 'heartbeat-response',
		});
	};

	private handlePresenceUpdate = async (
		message: PresenceUpdateMessage,
		clientKey: string,
		info: TokenInfo,
	) => {
		const updated = await this.presence.set(clientKey, info.userId, {
			presence: message.presence,
			internal: message.internal,
			replicaId: message.replicaId,
			id: info.userId,
		});
		this.sender.broadcast(
			{
				type: 'presence-changed',
				replicaId: message.replicaId,
				userInfo: updated,
			},
			// mirror back to the replica which sent it so it has profile
			[],
		);
	};

	private onPresenceLost = async (replicaId: string, userId: string) => {
		this.log('info', 'User disconnected from all replicas:', userId);
		this.sender.broadcast({
			type: 'presence-offline',
			replicaId,
			userId,
		});
		if (Object.keys(this.presence.all()).length === 0) {
			this.log('info', `All users have disconnected`);
			// could happen - if the server is shutting down manually
			if (!this.storage.open) {
				this.log('debug', 'Database not open, skipping cleanup');
				return;
			}
			const pendingDelete = await this.storage.fileMetadata.getPendingDelete();
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
								fileName: fileInfo.name,
								id: fileInfo.fileId,
								type: fileInfo.type,
							});
							await this.storage.fileMetadata.delete(fileInfo.fileId);
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

	destroy = async () => {
		this.log('info', 'Destroying library');
		this.presence.clear();
		await Promise.all([
			this.storage.replicas.deleteAll(),
			this.storage.operations.deleteAll(),
			this.storage.baselines.deleteAll(),
		]);
		const allFiles = await this.storage.fileMetadata.getAll();
		if (allFiles.length > 0) {
			this.log(
				'info',
				`Deleting ${allFiles.length} files`,
				allFiles.map((f) => f.fileId).join(', '),
			);
			for (const fileInfo of allFiles) {
				await this.fileStorage?.delete({
					fileName: fileInfo.name,
					id: fileInfo.fileId,
					type: fileInfo.type,
				});
			}
			await this.storage.fileMetadata.deleteAll();
		}
	};

	getPresence = () => {
		return Promise.resolve(this.presence.all());
	};

	getInfo = async (): Promise<LibraryInfo | null> => {
		const rawReplicas = await this.storage.replicas.getAll();
		const replicas = rawReplicas.map((r) => ({
			id: r.id,
			ackedLogicalTime: r.ackedLogicalTime,
			ackedServerOrder: r.ackedServerOrder,
			type: r.type,
			truant:
				!!r.lastSeenWallClockTime &&
				r.lastSeenWallClockTime < this.storage.replicas.truantCutoff,
		}));

		const data = {
			id: this.id,
			replicas,
			latestServerOrder: await this.storage.operations.getLatestServerOrder(),
			operationsCount: await this.storage.operations.getCount(),
			baselinesCount: await this.storage.baselines.getCount(),
			globalAck: (await this.storage.replicas.getGlobalAck()) ?? null,
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

	evictUser = async (userId: string) => {
		await this.storage.replicas.deleteAllForUser(userId);
	};

	forceTruant = async (replicaId: string) => {
		await this.storage.replicas.forceTruant(replicaId);
	};

	getDocumentSnapshot = (oid: string) => {
		return this.hydrateObject(oid);
	};

	getFileInfo = async (fileId: string) => {
		const rawFile = await this.hydrateFile(fileId);
		if (rawFile) {
			return {
				...rawFile,
				libraryId: this.id,
			};
		} else {
			return null;
		}
	};

	putFileInfo: (info: FileInfo) => Promise<void> = async (info) => {
		this.log('debug', 'Storing file info', info.id, info.fileName);
		await this.storage.fileMetadata.put(info);
	};

	private getObjectSnapshot = async (oid: string) => {
		const [baseline, ops] = await Promise.all([
			this.storage.baselines.get(oid),
			this.storage.operations.getAll(oid),
		]);
		const snapshot = applyOperations(baseline?.snapshot ?? undefined, ops);
		return snapshot;
	};

	private hydrateObject = async (oid: string): Promise<any> => {
		const snapshot = await this.getObjectSnapshot(oid);
		if (Array.isArray(snapshot)) {
			return Promise.all(
				snapshot.map(async (item: any) => {
					if (isObjectRef(item)) {
						return this.hydrateObject(item.id);
					} else if (isFileRef(item)) {
						return this.hydrateFile(item.id);
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
						hydrated[key] = await this.hydrateObject(value.id);
					} else if (isFileRef(value)) {
						hydrated[key] = await this.hydrateFile(value.id);
					}
				}),
			);
			return hydrated;
		} else {
			return snapshot;
		}
	};

	private hydrateFile = async (
		fileId: string,
	): Promise<Omit<LibraryFileInfo, 'libraryId'> | null> => {
		const data = await this.storage.fileMetadata.get(fileId);
		if (data) {
			const url =
				(await this.fileStorage?.getUrl({
					fileName: data.name,
					id: data.fileId,
					type: data.type,
				})) ?? null;

			return {
				id: data.fileId,
				name: data.name,
				type: data.type,
				url,
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
