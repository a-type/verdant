import {
	DocumentBaseline,
	Operation,
	Ref,
	ReplicaType,
} from '@verdant-web/common';
import {
	HydratedDocumentBaseline,
	StoredOperation,
	StoredReplicaInfo,
	FileMetadata,
} from '../types.js';
import { FileInfo } from '../files/FileStorage.js';

export interface ReplicaStorage {
	readonly truantCutoff: number;
	get(libraryId: string, replicaId: string): Promise<StoredReplicaInfo | null>;
	getOrCreate(
		libraryId: string,
		replicaId: string,
		info: { userId: string; type: ReplicaType },
	): Promise<{
		status: 'new' | 'existing' | 'truant';
		replicaInfo: StoredReplicaInfo;
	}>;
	getAll(
		libraryId: string,
		options?: { omitTruant: boolean },
	): Promise<StoredReplicaInfo[]>;
	updateLastSeen(libraryId: string, replicaId: string): Promise<void>;
	updateAckedServerOrder(
		libraryId: string,
		replicaId: string,
		serverOrder: number,
	): Promise<void>;
	updateAcknowledgedLogicalTime(
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void>;
	getEarliestAckedServerOrder(libraryId: string): Promise<number>;
	acknowledgeOperation(
		libraryId: string,
		replicaId: string,
		timestamp: string,
	): Promise<void>;
	getGlobalAck(
		libraryId: string,
		onlineReplicaIds?: string[],
	): Promise<string | null>;
	delete(libraryId: string, replicaId: string): Promise<void>;
	deleteAll(libraryId: string): Promise<void>;
	deleteAllForUser(libraryId: string, userId: string): Promise<void>;
}

export interface OperationStorage {
	getAll(libraryId: string, oid: string): Promise<StoredOperation[]>;
	getBeforeServerOrder(
		libraryId: string,
		beforeServerOrder: number,
	): Promise<StoredOperation[]>;
	getAfterServerOrder(
		libraryId: string,
		afterServerOrder: number,
	): Promise<StoredOperation[]>;
	getLatestServerOrder(libraryId: string): Promise<number>;
	getCount(libraryId: string): Promise<number>;
	insertAll(
		libraryId: string,
		replicaId: string,
		operations: Operation[],
	): Promise<void>;
	deleteAll(libraryId: string): Promise<void>;
	delete(libraryId: string, operations: Operation[]): Promise<void>;
}

export interface BaselineStorage {
	get(libraryId: string, oid: string): Promise<HydratedDocumentBaseline | null>;
	getAll(libraryId: string): Promise<HydratedDocumentBaseline[]>;
	insertAll(
		libraryId: string,
		baselines: DocumentBaseline<any>[],
	): Promise<void>;
	deleteAll(libraryId: string): Promise<void>;
	getCount(libraryId: string): Promise<number>;
	applyOperations(
		libraryId: string,
		oid: string,
		operations: StoredOperation[],
		deletedRefs?: Ref[],
	): Promise<void>;
}

export interface FileMetadataStorage {
	get(libraryId: string, fileId: string): Promise<FileMetadata | null>;
	getAll(libraryId: string): Promise<FileMetadata[]>;
	deleteAll(libraryId: string): Promise<void>;
	put(libraryId: string, fileInfo: FileInfo): Promise<void>;
	markPendingDelete(libraryId: string, fileId: string): Promise<void>;
	delete(libraryId: string, fileId: string): Promise<void>;
	getPendingDelete(libraryId: string): Promise<FileMetadata[]>;
}

export interface StorageOptions {
	replicaTruancyMinutes: number;
	fileDeleteExpirationDays: number;
}
export interface Storage {
	replicas: ReplicaStorage;
	operations: OperationStorage;
	baselines: BaselineStorage;
	fileMetadata: FileMetadataStorage;
	close(): Promise<void>;
	readonly open: boolean;
	readonly ready: Promise<void>;
}

export type StorageFactory = (options: StorageOptions) => Storage;
