import {
	CollectionFilter,
	DocumentBaseline,
	FileData,
	Migration,
	ObjectIdentifier,
	Operation,
} from '@verdant-web/common';
import { Context, InitialContext } from '../context/context.js';

export interface AckInfo {
	globalAckTimestamp: string | null;
}

export interface LocalReplicaInfo {
	id: string;
	userId: string | null;
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

export type AbstractTransaction = any;
export type QueryMode = 'readwrite' | 'readonly';
export interface CommonQueryOptions<
	Tx extends AbstractTransaction = AbstractTransaction,
> {
	transaction?: Tx;
	mode?: QueryMode;
}
export type Iterator<T> = (item: T) => void | boolean;

export interface PersistenceMetadataDb<
	Tx extends AbstractTransaction = AbstractTransaction,
> {
	transaction<T = void>(
		opts: {
			mode?: QueryMode;
			storeNames: string[];
			abort?: AbortSignal;
		},
		procedure: (tx: Tx) => Promise<T>,
	): Promise<T>;

	// infos
	getAckInfo(): Promise<AckInfo>;
	setGlobalAck(ack: string): Promise<void>;
	getLocalReplica(
		opts?: CommonQueryOptions<Tx>,
	): Promise<LocalReplicaInfo | undefined | null>;
	updateLocalReplica(
		data: LocalReplicaInfo,
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;

	// baselines
	iterateDocumentBaselines(
		rootOid: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;
	iterateCollectionBaselines(
		collection: string,
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;
	iterateAllBaselines(
		iterator: Iterator<DocumentBaseline>,
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;
	getBaseline(
		oid: string,
		opts?: CommonQueryOptions<Tx>,
	): Promise<DocumentBaseline | null>;
	setBaselines(
		baselines: DocumentBaseline[],
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;
	deleteBaseline(oid: string, opts?: CommonQueryOptions<Tx>): Promise<void>;

	// operations
	iterateDocumentOperations(
		rootOid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Tx> & {
			to?: string | null;
		},
	): Promise<void>;
	iterateEntityOperations(
		oid: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Tx> & { to?: string | null },
	): Promise<void>;
	iterateCollectionOperations(
		collection: string,
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Tx>,
	): Promise<void>;
	iterateLocalOperations(
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Tx> & {
			before?: string | null;
			after?: string | null;
		},
	): Promise<void>;
	/** Iterates over operations for an entity for processing and deletes them as it goes. */
	deleteEntityOperations(
		oid: string,
		opts: CommonQueryOptions<Tx> & { to: string | null },
	): Promise<void>;
	iterateAllOperations(
		iterator: Iterator<ClientOperation>,
		opts?: CommonQueryOptions<Tx> & {
			before?: string | null;
			from?: string | null;
		},
	): Promise<void>;
	/**
	 * @returns a list of all document (root) OIDs affected by the adds.
	 */
	addOperations(
		ops: ClientOperation[],
		opts?: CommonQueryOptions<Tx>,
	): Promise<ObjectIdentifier[]>;

	/* WARNING: deletes all data */
	reset(opts?: { clearReplica?: boolean; transaction?: Tx }): Promise<void>;

	stats(): Promise<{
		operationsSize: { count: number; size: number };
		baselinesSize: { count: number; size: number };
	}>;
}

export interface PersistenceDocumentDb {
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
		optsAndInfo: { abort?: AbortSignal; collections: string[] },
	): Promise<void>;

	reset(): Promise<void>;

	stats(): Promise<Record<string, { count: number; size: number }>>;

	close(): Promise<void>;
}

export interface PersistedFileData extends FileData {
	deletedAt: number | null;
}

export interface PersistenceFileDb {
	add(file: FileData, options?: { downloadRemote?: boolean }): Promise<void>;
	markUploaded(fileId: string): Promise<void>;
	get(fileId: string): Promise<PersistedFileData | null>;
	delete(fileId: string): Promise<void>;
	markPendingDelete(fileId: string): Promise<void>;
	listUnsynced(): Promise<PersistedFileData[]>;
	resetSyncedStatusSince(since: string | null): Promise<void>;
	iterateOverPendingDelete(
		iterator: (file: PersistedFileData) => void,
	): Promise<void>;
	loadFileContents(file: FileData, ctx: Context): Promise<Blob>;
	getAll(): Promise<PersistedFileData[]>;
	stats(): Promise<{ size: { count: number; size: number } }>;
}

export interface PersistenceNamespace {
	openMetadata(ctx: InitialContext): Promise<PersistenceMetadataDb>;
	/**
	 * Open the Documents database according to the schema in the given
	 * context. By the time this is called with a version, relevant migrations
	 * will have been applied.
	 */
	openDocuments(
		ctx: Omit<Context, 'documents' | 'files'>,
	): Promise<PersistenceDocumentDb>;
	/**
	 * Apply a migration to the namespace provided in ctx.
	 * This should make any transformations necessary to the
	 * document database to accommodate the new schema indexes.
	 * The migration itself contains a lot of information about
	 * what changed between versions.
	 *
	 * This method should also store the new version to persisted
	 * metadata, however your implementation chooses to do that.
	 */
	applyMigration(ctx: InitialContext, migration: Migration<any>): Promise<void>;
	openFiles(
		ctx: Omit<Context, 'files' | 'documents'>,
	): Promise<PersistenceFileDb>;
}

export interface PersistenceImplementation {
	name: string;
	openNamespace(
		namespace: string,
		ctx: Pick<Context, 'log' | 'persistenceShutdownHandler'>,
	): Promise<PersistenceNamespace>;
	/** Returns a list of all persisted namespaces visible to this app. */
	getNamespaces(): Promise<string[]>;
	/** Deletes all data from a particular namespace. */
	deleteNamespace(namespace: string, ctx: InitialContext): Promise<void>;
	/** Gets the schema version of the given namespace */
	getNamespaceVersion(namespace: string): Promise<number>;
	/**
	 * Copies all data from one namespace to another. It should
	 * overwrite the target namespace such that data and database
	 * schema are identical.
	 */
	copyNamespace(from: string, to: string, ctx: InitialContext): Promise<void>;
}
