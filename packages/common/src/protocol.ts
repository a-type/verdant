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
	oldestHistoryTimestamp?: string;
};

export type OperationRebroadcastMessage = {
	type: 'op-re';
	operations: Operation[];
	replicaId: string;
	globalAckTimestamp: string;
};

export type SyncMessage = {
	type: 'sync';
	/** This client's replica ID */
	replicaId: string;
	/** the logical time this message was sent */
	timestamp: string;
	/** the schema version known by this client */
	schemaVersion: number;
	/**
	 * the client may have lost its local data, in which
	 * case it may set this flag to be treated as a new client
	 * and receive a full baseline
	 */
	resyncAll?: boolean;
};

export type SyncResponseMessage = {
	type: 'sync-resp';
	// operations this client should apply
	operations: Operation[];
	// baselines this client should apply
	baselines: DocumentBaseline[];
	/**
	 * The server requests any changes since this time from the client.
	 * Null means all changes.
	 */
	provideChangesSince: string | null;
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
	globalAckTimestamp: string;

	/**
	 * A map of connected clients' presences values
	 */
	peerPresence: Record<string, UserInfo<any, any>>;
};

export type SyncStep2Message = {
	type: 'sync-step2';
	replicaId: string;
	/** Any new operations created since the requested time */
	operations: Operation[];
	/** Any new baselines created since the requested time */
	baselines: DocumentBaseline[];
	/** The time this message was sent. Can be used for ack. */
	timestamp: string;
};

export type RebasesMessage = {
	type: 'rebases';
	/**
	 * Rebases the client can perform. All operations
	 * for this document before this timestamp can
	 * be applied and dropped.
	 */
	rebases: { oid: string; upTo: string }[];
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

export type ClientMessage =
	| HeartbeatMessage
	| SyncMessage
	| SyncStep2Message
	| OperationMessage
	| AckMessage
	| PresenceUpdateMessage;
export type ServerMessage =
	| HeartbeatResponseMessage
	| SyncResponseMessage
	| OperationRebroadcastMessage
	| RebasesMessage
	| PresenceChangedMessage
	| PresenceOfflineMessage;
