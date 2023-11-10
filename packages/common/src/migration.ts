import {
	stableStringify,
	StorageCollectionSchema,
	StorageSchema,
	addFieldDefaults,
	StorageDocument,
	CollectionFilter,
	StorageDocumentInit,
	removeExtraProperties,
	assert,
	hasOid,
	assignOid,
	getOid,
	hasDefault,
} from './index.js';

/**@deprecated */
export interface DroppedCollectionMigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
> {
	(old: Old): void | Promise<void>;
}
/**@deprecated */
export interface PreservedCollectionMigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
	New extends StorageCollectionSchema<any, any, any>,
> {
	(
		old: StorageDocument<Old>,
	): StorageDocument<New> | Promise<StorageDocument<New>>;
}
/** @deprecated */
type MigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
	New extends StorageCollectionSchema<any, any, any>,
> =
	| DroppedCollectionMigrationStrategy<Old>
	| PreservedCollectionMigrationStrategy<Old, New>;
/** @deprecated */
export type MigrationsKeyedOnCollection<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> =
	| PreservedCollectionMigrations<Old, New>
	| DroppedCollectionMigrations<Old, New>;

/**@deprecated */
type NotInSchema<
	Name extends string | number | symbol,
	Schema extends StorageSchema<any>,
> = Name extends keyof Schema['collections'] ? never : Name;
/** @deprecated */
type InSchema<
	Name extends string | number | symbol,
	Schema extends StorageSchema<any>,
> = Name extends keyof Schema['collections'] ? Name : never;
/** @deprecated */
type DroppedCollections<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof Old['collections'] as NotInSchema<
		Key,
		New
	>]: StorageCollectionSchema<any, any, any>;
};
/** @deprecated */
type PreservedCollections<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof Old['collections'] as InSchema<
		Key,
		New
	>]: StorageCollectionSchema<any, any, any>;
};
/** @deprecated */
type DroppedCollectionMigrations<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof DroppedCollections<
		Old,
		New
	>]: DroppedCollectionMigrationStrategy<Old['collections'][Key]>;
};
/** @deprecated */
type PreservedCollectionMigrations<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof PreservedCollections<
		Old,
		New
	>]: PreservedCollectionMigrationStrategy<
		Old['collections'][Key],
		New['collections'][Key]
	>;
};

/** @deprecated */
type StrategyFor<
	Key extends string,
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = Key extends keyof New['collections']
	? PreservedCollectionMigrationStrategy<
			Old['collections'][Key],
			New['collections'][Key]
	  >
	: DroppedCollectionMigrationStrategy<Old['collections'][Key]>;

/** @deprecated */
type DeprecatedMigrationRunner<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = <Collection extends Extract<keyof Old['collections'], string>>(
	collection: Collection,
	strategy: StrategyFor<Collection, Old, New>,
) => Promise<void>;

/** @deprecated */
type DeprecatedMigrationQueryMaker<
	Collection extends StorageCollectionSchema<any, any, any>,
> = {
	get(primaryKey: string): Promise<StorageDocument<Collection> | undefined>;
	findOne(
		query: CollectionFilter,
	): Promise<StorageDocument<Collection> | undefined>;
	findAll(query?: CollectionFilter): Promise<StorageDocument<Collection>[]>;
};

/** @deprecated */
type DeprecatedMigrationQueries<Old extends StorageSchema<any>> = {
	[Key in keyof Old['collections']]: DeprecatedMigrationQueryMaker<
		Old['collections'][Key]
	>;
};

/** @deprecated */
type DeprecatedMigrationMutations<New extends StorageSchema> = {
	[Key in keyof New['collections']]: {
		put(
			document: StorageDocumentInit<New['collections'][Key]>,
		): Promise<StorageDocument<New['collections'][Key]>>;
		delete(primaryKey: string): Promise<void>;
	};
};
/** @deprecated */
export interface DeprecatedMigrationTools<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> {
	migrate: DeprecatedMigrationRunner<Old, New>;
	identity: <T>(val: T) => T;
	/**
	 * @deprecated - default field values are automatically
	 * applied during migration, you don't need to use this.
	 * Please remove it from your migrations - even old ones
	 * (old migrations can be updated!)
	 */
	withDefaults: (collectionName: string, value: any) => any;
	queries: DeprecatedMigrationQueries<Old>;
	mutations: DeprecatedMigrationMutations<New>;
	info: {
		changedCollections: keyof Old['collections'][];
		addedCollections: keyof New['collections'][];
		removedCollections: keyof Old['collections'][];
	};
}

export interface MigrationEngine {
	migrate: (collection: string, strategy: (val: any) => any) => Promise<void>;
	queries: MigrationQueries<any>;
	mutations: MigrationMutations<any>;
	/** OIDs of any new documents created during the migration */
	newOids: string[];
	/** Promises that should be resolved before completing the migration */
	awaitables: Promise<any>[];
	log: (...messages: any[]) => void;
}
/** @deprecated */
type DeprecatedMigrationProcedure<
	Old extends StorageSchema,
	New extends StorageSchema,
> = (tools: DeprecatedMigrationTools<Old, New>) => Promise<void>;

type EmptySchema = {
	version: 0;
	collections: {};
};
const emptySchema: EmptySchema = {
	version: 0,
	collections: {},
};

/** @deprecated - use createMigration */
export function migrate<Schema extends StorageSchema>(
	schema: Schema,
	procedure: DeprecatedMigrationProcedure<EmptySchema, Schema>,
): Migration<EmptySchema, Schema>;
/** @deprecated = use createMigration */
export function migrate<Old extends StorageSchema, New extends StorageSchema>(
	oldSchema: Old,
	newSchema: New,
	procedure: DeprecatedMigrationProcedure<Old, New>,
): Migration<Old, New>;
export function migrate(
	oldSchemaOrNewSchema: any,
	newSchemaOrProcedure: any,
	procedureIfTwoSchemas?: any,
) {
	const isProcedureSecondArgument = typeof newSchemaOrProcedure === 'function';
	const oldSchema = isProcedureSecondArgument
		? emptySchema
		: oldSchemaOrNewSchema;
	const newSchema = isProcedureSecondArgument
		? oldSchemaOrNewSchema
		: newSchemaOrProcedure;
	const procedure = isProcedureSecondArgument
		? newSchemaOrProcedure
		: procedureIfTwoSchemas;
	// diff to determine changed collections
	const changedCollections: string[] = Object.keys(
		newSchema.collections,
	).filter(
		(key) =>
			oldSchema.collections[key] &&
			stableStringify(oldSchema.collections[key]) !==
				stableStringify(newSchema.collections[key]),
	);
	const removedCollections: string[] = Object.keys(
		oldSchema.collections,
	).filter((key) => !newSchema.collections[key]);
	const addedCollections = Object.keys(newSchema.collections).filter(
		(key) => !oldSchema.collections[key],
	);
	// collections which added one or more field defaults
	const autoMigratedCollections = new Set<string>();
	for (const collection of changedCollections) {
		const oldFields = oldSchema.collections[collection].fields;
		const newFields = newSchema.collections[collection].fields;
		// a new default was added - we can auto-migrate it
		if (
			Object.keys(newFields).some(
				(key) => !oldFields[key]?.default && newFields[key]?.default,
			)
		) {
			autoMigratedCollections.add(collection);
		}
		// a field was removed - we can auto-migrate it
		if (Object.keys(oldFields).some((key) => !newFields[key])) {
			autoMigratedCollections.add(collection);
		}
	}

	const addedIndexes: Record<string, MigrationIndexDescription[]> = {};
	const removedIndexes: Record<string, MigrationIndexDescription[]> = {};
	for (const changed of [...changedCollections, ...addedCollections]) {
		const oldIndexes = getIndexes(oldSchema.collections[changed]);
		const newIndexes = getIndexes(newSchema.collections[changed]);
		const added = newIndexes.filter(
			(index) => !oldIndexes.find((i) => i.name === index.name),
		);
		const removed = oldIndexes.filter(
			(index) => !newIndexes.find((i) => i.name === index.name),
		);
		if (added.length > 0) {
			addedIndexes[changed] = added;
			// FIXME: don't o(n^2) this
			if (changedCollections.includes(changed)) {
				autoMigratedCollections.add(changed);
			}
		}
		if (removed.length > 0) {
			removedIndexes[changed] = removed;
			// FIXME: don't o(n^2) this
			if (changedCollections.includes(changed)) {
				autoMigratedCollections.add(changed);
			}
		}
	}

	const withDefaults = (collectionName: string, val: any) => {
		return addFieldDefaults(newSchema.collections[collectionName], val);
	};
	const autoMigration = (collectionName: string) => (val: any) => {
		const collection = newSchema.collections[collectionName];
		return addFieldDefaults(collection, removeExtraProperties(collection, val));
	};

	return {
		version: newSchema.version,
		migrate: async (engine: MigrationEngine) => {
			const migratedCollections: string[] = [];
			await procedure({
				migrate: async (collection: any, strategy: any) => {
					const auto = autoMigration(collection);
					const wrapped = async (val: any) => {
						const baseValue = await strategy(val);
						// assign OID from original value in case user's strategy
						// involves cloning
						assignOid(baseValue, getOid(val));
						const result = auto(baseValue);
						return result;
					};
					// @ts-ignore
					await engine.migrate(collection, wrapped);
					migratedCollections.push(collection);
					// since the user migrated this one and we wrap their
					// strategy with auto-migration, we can remove it from
					// the auto-migration list
					autoMigratedCollections.delete(collection);
				},
				identity: (val: any) => val,
				withDefaults,
				info: {
					changedCollections,
					addedCollections,
					removedCollections,
				},
				queries: engine.queries,
				mutations: engine.mutations,
			});

			// mandatory migration of fields which had defaults added or
			// fields removed but weren't migrated by the user

			if (newSchema.version > 1) {
				engine.log(
					'debug',
					'auto-migrating collections with new defaults',
					autoMigratedCollections,
				);
				for (const name of autoMigratedCollections) {
					await engine.migrate(name, autoMigration(name));
					migratedCollections.push(name);
				}

				const unmigrated = changedCollections.filter(
					(collection) => !migratedCollections.includes(collection),
				);
				if (unmigrated.length > 0) {
					// TODO: does this deserve a full-on error?
					console.error(
						`Unmigrated changed collections from version ${oldSchema.version} to version ${newSchema.version}:`,
						unmigrated,
					);
				}
			}
		},
		removedCollections,
		addedIndexes,
		removedIndexes,
		allCollections: Object.keys(newSchema.collections),
		changedCollections,
		addedCollections,
		oldCollections: Object.keys(oldSchema.collections),
		oldSchema,
		newSchema,
	};
}

export interface MigrationIndexDescription {
	name: string;
	multiEntry: boolean;
	synthetic: boolean;
	compound: boolean;
}

export interface Migration<
	Old extends StorageSchema = any,
	New extends StorageSchema = any,
> {
	version: number;
	oldSchema: Old;
	newSchema: New;
	migrate: (engine: MigrationEngine) => Promise<void>;
	/** Collections which are added in the new schema and not present in the old */
	addedCollections: string[];
	/** Collections which were removed from the old schema */
	removedCollections: string[];
	/** All collections which exist after the migration has completed - i.e. the ones in the new schema */
	allCollections: string[];
	/** Only the collections which were in the old schema */
	oldCollections: string[];
	/** Collections whose fields or indexes changed between schemas */
	changedCollections: string[];
	// new indexes mapped by collection name
	addedIndexes: Record<string, MigrationIndexDescription[]>;
	// removed indexes mapped by collection name
	removedIndexes: Record<string, MigrationIndexDescription[]>;
}

export function migrationRange(from: number, to: number) {
	return [...Array(to - from).keys()].map((i) => 1 + i + from);
}

function getIndexes<Coll extends StorageCollectionSchema<any, any, any>>(
	collection: Coll | undefined,
): MigrationIndexDescription[] {
	if (!collection) return [];

	return [
		...Object.keys(collection.indexes || {}).map((key) => ({
			name: key,
			multiEntry: ['array', 'string[]', 'number[]', 'boolean[]'].includes(
				collection.indexes[key].type,
			),
			synthetic: true,
			compound: false,
		})),
		...Object.keys(collection.compounds || {}).map((key) => ({
			name: key,
			multiEntry: collection.compounds[key].of.some(
				(fieldName: string) =>
					(collection.fields[fieldName] || collection.indexes[fieldName])
						.type === 'array',
			),
			synthetic: false,
			compound: true,
		})),
	];
}

/** @deprecated - use createMigration with no procedure function */
export function createDefaultMigration(
	schema: StorageSchema,
): Migration<{ version: 0; collections: {} }>;
/** @deprecated - use createMigration with no procedure function */
export function createDefaultMigration<Old extends StorageSchema>(
	oldSchema: Old,
	newSchema: StorageSchema,
): Migration<Old>;
export function createDefaultMigration(
	schema: StorageSchema,
	newSchema?: StorageSchema<any>,
) {
	let oldSchema = newSchema
		? schema
		: {
				version: 0,
				collections: {},
		  };
	return migrate(oldSchema, newSchema || schema, async ({ migrate, info }) => {
		if ((newSchema || schema).version === 1) return;

		for (const collection of info.changedCollections as any) {
			// @ts-ignore indefinite type resolution
			await migrate(collection, (old) => old);
		}
	});
}

/** New, simpler type-safety migration tools */
type DocumentShape<Init = any, Snapshot = any> = {
	init: Init;
	snapshot: Snapshot;
};
type SchemaDocuments = Record<string, DocumentShape>;
type CollectionProcedure<OldSnapshot, NewInit> = {
	(old: OldSnapshot): NewInit | Promise<NewInit>;
};
type MigrationQueries<Old extends SchemaDocuments> = {
	[Key in keyof Old]: {
		get(primaryKey: string): Promise<Old[Key]['snapshot'] | undefined>;
		findOne(query: CollectionFilter): Promise<Old[Key]['snapshot'] | undefined>;
		findAll(query?: CollectionFilter): Promise<Old[Key]['snapshot'][]>;
	};
};
type MigrationMutations<New extends SchemaDocuments> = {
	[Key in keyof New]: {
		put(document: New[Key]['init']): Promise<New[Key]['snapshot']>;
		delete(primaryKey: string): Promise<void>;
	};
};
type MigrationTools<
	Old extends SchemaDocuments,
	New extends SchemaDocuments,
> = {
	/**
	 * Process a change in a collection's documents by taking in each existing
	 * document and returning its new shape. This is typed so you can be
	 * confident the proper transformations are made.
	 */
	migrate: <Collection extends keyof Old & keyof New>(
		collection: Collection,
		strategy: CollectionProcedure<
			Old[Collection]['snapshot'],
			New[Collection]['init']
		>,
	) => Promise<void>;
	mutations: MigrationMutations<New>;
	queries: MigrationQueries<Old>;
	info: {
		changedCollections: (keyof Old & keyof New)[];
		addedCollections: (keyof New)[];
		removedCollections: (keyof Old)[];
	};
};
type MigrationProcedure<
	Old extends SchemaDocuments,
	New extends SchemaDocuments,
> = {
	(tools: MigrationTools<Old, New>): Promise<void>;
};
type InitialMigrationTools<New extends SchemaDocuments> = {
	mutations: MigrationMutations<New>;
};
type InitialMigrationProcedure<New extends SchemaDocuments> = {
	(tools: InitialMigrationTools<New>): Promise<void>;
};

export function createMigration<New extends SchemaDocuments>(
	newSchema: StorageSchema,
	procedure?: InitialMigrationProcedure<New>,
): any;
export function createMigration<
	Old extends SchemaDocuments,
	New extends SchemaDocuments,
>(
	oldSchema: StorageSchema,
	newSchema: StorageSchema,
	procedure?: MigrationProcedure<Old, New>,
): any;
export function createMigration(
	maybeOldSchema: StorageSchema,
	maybeNewSchemaOrProcedure?:
		| StorageSchema
		| InitialMigrationProcedure<SchemaDocuments>,
	maybeProcedure?: MigrationProcedure<SchemaDocuments, SchemaDocuments>,
): any {
	const isProcedureSecondArgument =
		typeof maybeNewSchemaOrProcedure === 'function' ||
		maybeNewSchemaOrProcedure === undefined;
	const oldSchema = isProcedureSecondArgument ? emptySchema : maybeOldSchema;
	const newSchema = isProcedureSecondArgument
		? maybeOldSchema
		: maybeNewSchemaOrProcedure;
	const procedure = isProcedureSecondArgument
		? maybeNewSchemaOrProcedure
		: maybeProcedure;
	assert(oldSchema, 'Invalid arguments to createMigration');
	assert(newSchema, 'Invalid arguments to createMigration');
	const {
		changedCollections,
		addedCollections,
		removedCollections,
		addedIndexes,
		removedIndexes,
		autoMigratedCollections,
		autoMigration,
	} = getMigrationInfo(oldSchema, newSchema);

	return {
		version: newSchema.version,
		migrate: async (engine: MigrationEngine) => {
			const migratedCollections: string[] = [];
			const migrate = async (collection: any, strategy: any) => {
				const auto = autoMigration(collection);
				const wrapped = async (val: any) => {
					const baseValue = await strategy(val);
					// assign OID from original value in case user's strategy
					// involves cloning
					assignOid(baseValue, getOid(val));
					const result = auto(baseValue);
					return result;
				};
				// @ts-ignore
				await engine.migrate(collection, wrapped);
				migratedCollections.push(collection);
				// since the user migrated this one and we wrap their
				// strategy with auto-migration, we can remove it from
				// the auto-migration list
				autoMigratedCollections.delete(collection);
			};
			await procedure?.({
				migrate,
				info: {
					changedCollections,
					addedCollections,
					removedCollections,
				},
				queries: engine.queries,
				mutations: engine.mutations,
			});

			// mandatory migration of fields which had defaults added or
			// fields removed but weren't migrated by the user

			if (newSchema.version > 1) {
				engine.log(
					'debug',
					'auto-migrating collections with new defaults',
					autoMigratedCollections,
				);
				for (const name of autoMigratedCollections) {
					await engine.migrate(name, autoMigration(name));
					migratedCollections.push(name);
				}

				const unmigrated = changedCollections.filter(
					(collection) => !migratedCollections.includes(collection),
				);
				if (unmigrated.length > 0) {
					// TODO: does this deserve a full-on error?
					console.error(
						`Unmigrated changed collections from version ${oldSchema.version} to version ${newSchema.version}:`,
						unmigrated,
					);
				}
			}
		},
		removedCollections,
		addedIndexes,
		removedIndexes,
		allCollections: Object.keys(newSchema.collections),
		changedCollections,
		addedCollections,
		oldCollections: Object.keys(oldSchema.collections),
		oldSchema,
		newSchema,
	};
}

// common tools
function getMigrationInfo(oldSchema: StorageSchema, newSchema: StorageSchema) {
	const changedCollections: string[] = Object.keys(
		newSchema.collections,
	).filter(
		(key) =>
			oldSchema.collections[key] &&
			stableStringify(oldSchema.collections[key]) !==
				stableStringify(newSchema.collections[key]),
	);
	const removedCollections: string[] = Object.keys(
		oldSchema.collections,
	).filter((key) => !newSchema.collections[key]);
	const addedCollections = Object.keys(newSchema.collections).filter(
		(key) => !oldSchema.collections[key],
	);
	// collections which added one or more field defaults
	const autoMigratedCollections = new Set<string>();
	for (const collection of changedCollections) {
		const oldFields = oldSchema.collections[collection].fields;
		const newFields = newSchema.collections[collection].fields;
		// a new default was added - we can auto-migrate it
		if (
			Object.keys(newFields).some(
				(key) => !hasDefault(oldFields[key]) && hasDefault(newFields[key]),
			)
		) {
			autoMigratedCollections.add(collection);
		}
		// a field was removed - we can auto-migrate it
		if (Object.keys(oldFields).some((key) => !newFields[key])) {
			autoMigratedCollections.add(collection);
		}
	}

	const addedIndexes: Record<string, MigrationIndexDescription[]> = {};
	const removedIndexes: Record<string, MigrationIndexDescription[]> = {};
	for (const changed of [...changedCollections, ...addedCollections]) {
		const oldIndexes = getIndexes(oldSchema.collections[changed]);
		const newIndexes = getIndexes(newSchema.collections[changed]);
		const added = newIndexes.filter(
			(index) => !oldIndexes.find((i) => i.name === index.name),
		);
		const removed = oldIndexes.filter(
			(index) => !newIndexes.find((i) => i.name === index.name),
		);
		if (added.length > 0) {
			addedIndexes[changed] = added;
			// FIXME: don't o(n^2) this
			if (changedCollections.includes(changed)) {
				autoMigratedCollections.add(changed);
			}
		}
		if (removed.length > 0) {
			removedIndexes[changed] = removed;
			// FIXME: don't o(n^2) this
			if (changedCollections.includes(changed)) {
				autoMigratedCollections.add(changed);
			}
		}
	}

	const withDefaults = (collectionName: string, val: any) => {
		return addFieldDefaults(newSchema.collections[collectionName], val);
	};
	const autoMigration = (collectionName: string) => (val: any) => {
		const collection = newSchema.collections[collectionName];
		return addFieldDefaults(collection, removeExtraProperties(collection, val));
	};

	return {
		changedCollections,
		addedCollections,
		removedCollections,
		addedIndexes,
		removedIndexes,
		autoMigratedCollections,
		withDefaults,
		autoMigration,
	};
}
