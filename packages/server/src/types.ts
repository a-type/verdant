import { DocumentBaseline, ReplicaInfo, SyncOperation } from '@lofi/common';

export type OperationHistoryItemSpec = Omit<SyncOperation, 'patch'> & {
	libraryId: string;
	patch: string;
};

export interface DocumentBaselineSpec
	extends Omit<DocumentBaseline<any>, 'snapshot'> {
	snapshot: string;
	libraryId: string;
}

export interface DocumentSpec {
	id: string;
	libraryId: string;
	collection: string;
	snapshot: any;
	timestamp: string;
}

export interface ReplicaInfoSpec extends ReplicaInfo {
	libraryId: string;
	// the authenticated client ID authorized
	// to write to this replica
	clientId: string;
	lastSeenWallClockTime: number | null;
}
