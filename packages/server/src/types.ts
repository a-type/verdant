import {
	DocumentBaseline,
	Operation,
	ReplicaInfo,
	ReplicaType,
} from '@verdant-web/common';

export interface StoredOperation extends Operation {
	serverOrder: number;
	replicaId: string;
}

export interface StoredDocumentBaseline
	extends Omit<DocumentBaseline<any>, 'snapshot'> {
	snapshot: string;
	libraryId: string;
}

export interface HydratedDocumentBaseline extends DocumentBaseline<any> {
	libraryId: string;
}

export interface StoredReplicaInfo extends ReplicaInfo {
	libraryId: string;
	/** AKA userId!! */
	clientId: string;
	lastSeenWallClockTime: number | null;
	type: ReplicaType;
	ackedServerOrder: number;
}

export type LibraryInfo = {
	id: string;
	replicas: {
		id: string;
		ackedLogicalTime: string | null;
		ackedServerOrder: number;
		type: ReplicaType;
		truant: boolean;
		userId: string;
	}[];
	latestServerOrder: number;
	operationsCount: number;
	baselinesCount: number;
	globalAck: string | null;
};

export interface FileMetadata {
	libraryId: string;
	fileId: string;
	name: string;
	type: string;
	pendingDeleteAt: number | null;
}

// patch File
declare global {
	interface File {
		readonly lastModified: number;
		readonly name: string;
	}
}
