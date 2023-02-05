import {
	DocumentBaseline,
	Operation,
	ReplicaInfo,
	ReplicaType,
} from '@lo-fi/common';

export interface DocumentBaselineSpec
	extends Omit<DocumentBaseline<any>, 'snapshot'> {
	snapshot: string;
	libraryId: string;
}

export interface ReplicaInfoSpec extends ReplicaInfo {
	libraryId: string;
	// the authenticated client ID authorized
	// to write to this replica
	clientId: string;
	lastSeenWallClockTime: number | null;
	type: ReplicaType;
}

// patch File
declare global {
	interface File {
		readonly lastModified: number;
		readonly name: string;
	}
}
