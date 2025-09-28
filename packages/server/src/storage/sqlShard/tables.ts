import { ReplicaType } from '@verdant-web/common';

export interface Database {
	OperationHistory: OperationHistoryTable;
	DocumentBaseline: DocumentBaselineTable;
	ReplicaInfo: ReplicaInfoTable;
	FileMetadata: FileMetadataTable;
	_Migrations: { id: number; appliedAt: string };
}

export interface OperationHistoryTable {
	oid: string;
	timestamp: string;
	data: string;
	serverOrder: number;
	replicaId: string;
	authz: string | null;
}
export type OperationHistoryRow = OperationHistoryTable;

export interface DocumentBaselineTable {
	oid: string;
	snapshot: string;
	timestamp: string;
	authz: string | null;
}
export type DocumentBaselineRow = DocumentBaselineTable;

export interface ReplicaInfoTable {
	id: string;
	clientId: string;
	lastSeenWallClockTime: number | null;
	ackedLogicalTime: string | null;
	type: ReplicaType;
	ackedServerOrder: number;
}

export type ReplicaInfoRow = ReplicaInfoTable;

export interface FileMetadataTable {
	fileId: string;
	name: string;
	type: string;
	pendingDeleteAt: number | null;
}

export type FileMetadataRow = FileMetadataTable;
