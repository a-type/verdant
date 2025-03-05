import {
	DocumentBaseline,
	Operation,
	Ref,
	ReplicaType,
} from '@verdant-web/common';
import { FileInfo } from '../files/FileStorage.js';
import {
	FileMetadata,
	HydratedDocumentBaseline,
	StoredOperation,
	StoredReplicaInfo,
} from '../types.js';

export interface ReplicaStorage {
	readonly truantCutoff: number;
	get(replicaId: string): Promise<StoredReplicaInfo | null>;
	getOrCreate(
		replicaId: string,
		info: { userId: string; type: ReplicaType },
	): Promise<{
		status: 'new' | 'existing' | 'truant';
		replicaInfo: StoredReplicaInfo;
	}>;
	getAll(options?: { omitTruant: boolean }): Promise<StoredReplicaInfo[]>;
	updateLastSeen(replicaId: string): Promise<void>;
	updateAckedServerOrder(replicaId: string, serverOrder: number): Promise<void>;
	updateAcknowledgedLogicalTime(
		replicaId: string,
		timestamp: string,
	): Promise<void>;
	getEarliestAckedServerOrder(): Promise<number>;
	acknowledgeOperation(replicaId: string, timestamp: string): Promise<void>;
	getGlobalAck(onlineReplicaIds?: string[]): Promise<string | null>;
	delete(replicaId: string): Promise<void>;
	deleteAll(): Promise<void>;
	deleteAllForUser(userId: string): Promise<void>;
}

export interface OperationStorage {
	getAll(oid: string): Promise<StoredOperation[]>;
	getBeforeServerOrder(beforeServerOrder: number): Promise<StoredOperation[]>;
	getAfterServerOrder(afterServerOrder: number): Promise<StoredOperation[]>;
	getLatestServerOrder(): Promise<number>;
	getCount(): Promise<number>;
	insertAll(replicaId: string, operations: Operation[]): Promise<number>;
	deleteAll(): Promise<void>;
	delete(operations: Operation[]): Promise<void>;
}

export interface BaselineStorage {
	get(oid: string): Promise<HydratedDocumentBaseline | null>;
	getAll(): Promise<HydratedDocumentBaseline[]>;
	insertAll(baselines: DocumentBaseline<any>[]): Promise<void>;
	deleteAll(): Promise<void>;
	getCount(): Promise<number>;
	applyOperations(
		oid: string,
		operations: StoredOperation[],
		deletedRefs?: Ref[],
	): Promise<void>;
}

export interface FileMetadataStorage {
	get(fileId: string): Promise<FileMetadata | null>;
	getAll(): Promise<FileMetadata[]>;
	deleteAll(): Promise<void>;
	put(fileInfo: FileInfo): Promise<void>;
	markPendingDelete(fileId: string): Promise<void>;
	delete(fileId: string): Promise<void>;
	getPendingDelete(): Promise<FileMetadata[]>;
}

export interface StorageOptions {
	replicaTruancyMinutes?: number;
	fileDeleteExpirationDays?: number;
}
export interface Storage {
	replicas: ReplicaStorage;
	operations: OperationStorage;
	baselines: BaselineStorage;
	fileMetadata: FileMetadataStorage;
	close(): Promise<void>;
	readonly open: boolean;
}

export type StorageFactory = (libraryId: string) => Promise<Storage>;
export type StorageFactoryFactory = (options: StorageOptions) => StorageFactory;
