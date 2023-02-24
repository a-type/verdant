// client ID, and therefore library ID, is inferred

import { DocumentBaseline } from './baseline.js';
import { Operation, OperationPatch } from './operation.js';
import { UserInfo } from './presence.js';

export type HeartbeatMessage = {
	type: 'heartbeat';
	timestamp: string;
	replicaId: string;
};

export type HeartbeatResponseMessage = {
	type: 'heartbeat-response';
};

/**
 * Used by clients to indicate they have
 * successfully applied all operations from the
 * server up to this logical timestamp.
 */
export type AckMessage = {
	type: 'ack';
	replicaId: string;
	timestamp: string;
};

export type OperationMessage = {
	type: 'op';
	replicaId: string;
	operations: Operation[];
	timestamp: string;
};

export type OperationRebroadcastMessage = {
	type: 'op-re';
	operations: Operation[];
	baselines: DocumentBaseline[];
	replicaId: string;
	globalAckTimestamp: string | undefined;
};

export type SyncMessage = {
	type: 'sync';
	/** This client's replica ID */
	replicaId: string;
	/** the logical time this message was sent */
	timestamp: string;
	/** Any new operations created since the requested time */
	operations: Operation[];
	/** Any new baselines created since the requested time */
	baselines: DocumentBaseline[];
	/** the schema version known by this client */
	schemaVersion: number;
	/**
	 * the client may have lost its local data, in which
	 * case it may set this flag to be treated as a new client
	 * and receive a full baseline
	 */
	resyncAll?: boolean;
	/**
	 * timestamp of when the replica changes began. null means
	 * full changeset from start of time
	 */
	since: string | null;
};

export type SyncResponseMessage = {
	type: 'sync-resp';
	// operations this client should apply
	operations: Operation[];
	// baselines this client should apply
	baselines: DocumentBaseline[];
	/**
	 * If this flag is set, the client should discard local data
	 * and reset to incoming data only. Used when a client requested
	 * resyncAll in its sync message, or for clients which have been
	 * offline for too long. When specified true, provideChangesSince
	 * should be ignored.
	 */
	overwriteLocalData: boolean;
	/**
	 * Update client on the global ack
	 */
	globalAckTimestamp: string | undefined;

	/**
	 * A map of connected clients' presences values
	 */
	peerPresence: Record<string, UserInfo<any, any>>;

	/**
	 * The timestamp sent in the original sync message -
	 * this confirms the server has received the client's
	 * state up to this point. Subsequent syncs should not
	 * include operations or baselines older than this timestamp.
	 */
	ackedTimestamp: string;

	/**
	 * The client should respond with a sync-ack containing
	 * this nonce to confirm it has received this message if
	 * it is not undefined
	 */
	ackThisNonce?: string;
};

export type SyncAckMessage = {
	type: 'sync-ack';
	/** The client's replica ID */
	replicaId: string;
	/** the logical time this message was sent */
	timestamp: string;
	/** the nonce sent in the sync-resp message */
	nonce: string;
};

export type PresenceUpdateMessage = {
	type: 'presence-update';
	/** The client's replica ID */
	replicaId: string;
	/** new presence value */
	presence: any;
};

export type PresenceChangedMessage = {
	type: 'presence-changed';
	/** The client's replica ID */
	replicaId: string;

	userInfo: UserInfo<any, any>;
};

export type PresenceOfflineMessage = {
	type: 'presence-offline';
	userId: string;
	replicaId: string;
};

export type GlobalAckMessage = {
	type: 'global-ack';
	timestamp: string;
};

export type ForbiddenMessage = {
	type: 'forbidden';
};

export type ServerAckMessage = {
	type: 'server-ack';
	timestamp: string;
};

export type ServerNeedSinceMessage = {
	type: 'need-since';
	since: string | null;
};

export type SendMessageMessage = {
	type: 'send-message';
	message: string;
	replicaId: string;
	timestamp: string;
	toUserId?: string;
};

export type MessageReceivedMessage = {
	type: 'message-received';
	message: string;
	fromReplicaId: string;
	fromUserId: string;
	timestamp: string;
};

export type ClientMessage =
	| HeartbeatMessage
	| SyncMessage
	| OperationMessage
	| AckMessage
	| SyncAckMessage
	| PresenceUpdateMessage
	| SendMessageMessage;
export type ServerMessage =
	| HeartbeatResponseMessage
	| SyncResponseMessage
	| OperationRebroadcastMessage
	| PresenceChangedMessage
	| PresenceOfflineMessage
	| GlobalAckMessage
	| ForbiddenMessage
	| ServerAckMessage
	| ServerNeedSinceMessage
	| MessageReceivedMessage;
