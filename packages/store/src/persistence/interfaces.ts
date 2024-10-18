import {
	CollectionFilter,
	DocumentBaseline,
	FileData,
	ObjectIdentifier,
	Operation,
} from '@verdant-web/common';
import { Context, InitialContext } from '../context/context.js';

export interface AckInfo {
	type: 'ack';
	globalAckTimestamp: string | null;
}

export interface LocalReplicaInfo {
	type: 'localReplicaInfo';
	id: string;
	userId: string | undefined;
	ackedLogicalTime: string | null;
	lastSyncedLogicalTime: string | null;
}

export type ClientOperation = Operation & {
	isLocal: boolean;
};

export interface MetadataExport {
	operations: Operation[];
	baselines: DocumentBaseline[];
	localReplica?: LocalReplicaInfo;
	schemaVersion: number;
}

export interface ExportedData {
	data: MetadataExport;
	fileData: Array<Omit<PersistedFileData, 'file'>>;
	files: File[];
}

export type AbstractTransaction = unknown;
export type QueryMode = 'readwrite' | 'readonly';
export interface CommonQueryOptions {
	transaction?: AbstractTransaction;
	mode?: QueryMode;
}
export type Iterator<T> = (item: T) => void | boolean;

export interface PersistenceMetadataDb {
	transaction(opts: {
		mode?: QueryMode;
		storeNames: string[];
		abort?: AbortSignal;
	}): AbstractTransaction;
	dispose(): void | Promise<void>;

	// infos
	getAckInfo(): Promise<AckInfo>;
	setGlobalAck(ack: string): Promise<void>;
	getLocalReplica(opts?: CommonQueryOptions): Promise<LocalReplicaInfo>;
	updateLocalReplica(
		data: Partial<LocalReplicaInfo>,
		opts?: CommonQueryOptions,
	): Promise<void>;

	// baselines
	iterateDocumentBaselines(
		rootOid: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions,
	): Promise<void>;
	iterateCollectionBaselines(
		collection: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions,
	): Promise<void>;
	iterateAllBaselines(
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions,
	): Promise<void>;
	getBaseline(
		oid: string,
		opts?: CommonQueryOptions,
	): Promise<DocumentBaseline>;
	setBaselines(
		baselines: DocumentBaseline[],
		opts?: CommonQueryOptions,
	): Promise<void>;
	deleteBaseline(oid: string, opts?: CommonQueryOptions): Promise<void>;

	// operations
	iterateDocumentOperations(
		rootOid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions & {
			to?: string | null;
		},
	): Promise<void>;
	iterateEntityOperations(
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions & { to?: string | null },
	): Promise<void>;
	iterateCollectionOperations(
		collection: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions,
	): Promise<void>;
	iterateLocalOperations(
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions & {
			before?: string | null;
			after?: string | null;
		},
	): Promise<void>;
	/** Iterates over operations for an entity for processing and deletes them as it goes. */
	consumeEntityOperations(
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions & { to?: string | null },
	): Promise<void>;
	iterateAllOperations(
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions & {
			before?: string | null;
			from?: string | null;
		},
	): Promise<void>;
	/**
	 * @returns a list of all document (root) OIDs affected by the adds.
	 */
	addOperations(
		ops: ClientOperation[],
		opts?: CommonQueryOptions,
	): Promise<ObjectIdentifier[]>;

	/* WARNING: deletes all data */
	reset(opts?: {
		clearReplica?: boolean;
		transaction?: AbstractTransaction;
	}): Promise<void>;

	stats(): Promise<{
		operationsSize: { count: number; size: number };
		baselinesSize: { count: number; size: number };
	}>;
}

export interface PersistenceQueryDb {
	transaction(opts: {
		mode?: QueryMode;
		storeNames: string[];
		abort?: AbortSignal;
	}): AbstractTransaction;
	dispose(): void | Promise<void>;

	findOneOid(opts: {
		collection: string;
		index?: CollectionFilter;
	}): Promise<ObjectIdentifier | null>;
	findAllOids(opts: {
		collection: string;
		index?: CollectionFilter;
		limit?: number;
		offset?: number;
	}): Promise<{ result: ObjectIdentifier[]; hasNextPage: boolean }>;

	saveEntities(
		entities: { oid: ObjectIdentifier; getSnapshot: () => any }[],
		opts?: CommonQueryOptions & { abort?: AbortSignal },
	): Promise<void>;

	reset(opts?: { transaction?: AbstractTransaction }): Promise<void>;

	stats(): Promise<Record<string, { count: number; size: number }>>;
}

export interface PersistedFileData extends FileData {
	deletedAt: number | null;
}

export interface PersistenceFileDb {
	transaction(opts: {
		mode?: QueryMode;
		storeNames: string[];
		abort?: AbortSignal;
	}): AbstractTransaction;
	dispose(): void | Promise<void>;

	add(
		file: FileData,
		options?: { transaction?: AbstractTransaction; downloadRemote?: boolean },
	): Promise<void>;
	markUploaded(
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void>;
	get(
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<PersistedFileData | null>;
	delete(
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void>;
	markPendingDelete(
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void>;
	listUnsynced(options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]>;
	resetSyncedStatusSince(
		since: string | null,
		options?: { transaction?: AbstractTransaction },
	): Promise<void>;
	iterateOverPendingDelete(
		iterator: (file: PersistedFileData, store: IDBObjectStore) => void,
		options?: { transaction?: IDBTransaction },
	): Promise<void>;
	getAll(options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]>;
	stats(): Promise<{ size: { count: number; size: number } }>;
}

export interface PersistenceImplementation {
	openMetadata(ctx: InitialContext): Promise<PersistenceMetadataDb>;
	openQueries(ctx: Omit<Context, 'queries'>): Promise<PersistenceQueryDb>;
	openFiles(
		ctx: Omit<Context, 'files' | 'queries'>,
	): Promise<PersistenceFileDb>;
	/** Copies all data (metadata/document queries/files) from one namespace to another. */
	copyNamespace(from: string, to: string, ctx: InitialContext): Promise<void>;
	/** Returns a list of all persisted namespaces visible to this app. */
	getNamespaces(): Promise<string[]>;
	/** Deletes all data from a particular namespace. */
	deleteNamespace(namespace: string, ctx: InitialContext): Promise<void>;
}
