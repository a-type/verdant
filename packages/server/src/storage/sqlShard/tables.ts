import { ReplicaType } from '@verdant-web/common';
import { Generated, Selectable } from 'kysely';

export interface Database {
	OperationHistory: OperationHistoryTable;
	DocumentBaseline: DocumentBaselineTable;
	ReplicaInfo: ReplicaInfoTable;
	FileMetadata: FileMetadataTable;
}

export interface OperationHistoryTable {
	oid: string;
	timestamp: string;
	data: string;
	serverOrder: number;
	replicaId: string;
}
export type OperationHistoryRow = Selectable<OperationHistoryTable>;

export interface DocumentBaselineTable {
	oid: string;
	snapshot: string;
	timestamp: string;
}
export type DocumentBaselineRow = Selectable<DocumentBaselineTable>;

export interface ReplicaInfoTable {
	id: string;
	clientId: string;
	lastSeenWallClockTime: number | null;
	ackedLogicalTime: string | null;
	type: ReplicaType;
	ackedServerOrder: Generated<number>;
}

export type ReplicaInfoRow = Selectable<ReplicaInfoTable>;

export interface FileMetadataTable {
	fileId: string;
	name: string;
	type: string;
	pendingDeleteAt: number | null;
}

export type FileMetadataRow = Selectable<FileMetadataTable>;
