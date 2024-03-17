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
	// the authenticated client ID authorized
	// to write to this replica
	clientId: string;
	lastSeenWallClockTime: number | null;
	type: ReplicaType;
	ackedServerOrder: number;
}

export type LibraryInfo<Profile = unknown> = {
	id: string;
	replicas: {
		id: string;
		ackedLogicalTime: string | null;
		ackedServerOrder: number;
		type: ReplicaType;
		truant: boolean;
		profile: Profile;
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
