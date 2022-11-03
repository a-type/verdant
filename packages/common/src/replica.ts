export interface ReplicaInfo {
	id: string;
	ackedLogicalTime: string | null;
}

/**
 * Different token types allow different replica client behaviors.
 * - Realtime: allows the client to subscribe to realtime events.
 * - Push: allows the client to push and pull data with HTTP, but not use realtime.
 * - PassivePush: allows the client to push and pull data with HTTP, but offline changes
 *     will be discarded on reconnect.
 * - PassiveRealtime: allows the client to subscribe to realtime events, but offline changes
 * 		 will be discarded on reconnect.
 * - ReadOnlyPull: the client may only pull changes using HTTP. It may not subscribe
 *     to realtime events or push changes.
 * - ReadOnlyRealtime: the client may only subscribe to realtime events or pull from HTTP.
 *     It may not push changes.
 *
 * Choosing the right token type can optimize client storage metrics significantly when
 * many replicas are connecting to a library.
 */
export enum ReplicaType {
	Realtime,
	Push,
	PassiveRealtime,
	PassivePush,
	ReadOnlyPull,
	ReadOnlyRealtime,
}
