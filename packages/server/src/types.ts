import { DocumentBaseline, Operation, ReplicaInfo } from '@lofi/common';

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
}
