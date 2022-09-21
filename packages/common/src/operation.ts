import { SyncPatch } from './patch.js';

export interface SyncOperation {
	id: string;
	/**
	 * Which replica created the operation.
	 * Remember that 1 client can have multiple replicas
	 * (i.e. multiple devices associated with their account).
	 */
	replicaId: string;
	/**
	 * Named document collection.
	 */
	collection: string;
	/**
	 * Primary document ID
	 */
	documentId: string;
	/**
	 * The changes applied to the document
	 */
	patch: SyncPatch; // TODO: encode?
	/**
	 * The logical timestamp the operation was created at.
	 */
	timestamp: string;
}
