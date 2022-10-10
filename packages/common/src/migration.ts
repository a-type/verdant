import {
	stableStringify,
	StorageCollectionSchema,
	StorageSchema,
} from './index.js';

export interface DroppedCollectionMigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
> {
	(old: Old): void;
}
export interface PreservedCollectionMigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
	New extends StorageCollectionSchema<any, any, any>,
> {
	(old: Old): New;
}

type MigrationStrategy<
	Old extends StorageCollectionSchema<any, any, any>,
	New extends StorageCollectionSchema<any, any, any>,
> =
	| DroppedCollectionMigrationStrategy<Old>
	| PreservedCollectionMigrationStrategy<Old, New>;

export type MigrationsKeyedOnCollection<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> =
	| PreservedCollectionMigrations<Old, New>
	| DroppedCollectionMigrations<Old, New>;

type NotInSchema<
	Name extends string | number | symbol,
	Schema extends StorageSchema<any>,
> = Name extends keyof Schema['collections'] ? never : Name;
type InSchema<
	Name extends string | number | symbol,
	Schema extends StorageSchema<any>,
> = Name extends keyof Schema['collections'] ? Name : never;

type NewCollections<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof New['collections'] as NotInSchema<
		Key,
		Old
	>]: StorageCollectionSchema<any, any, any>;
};

type DroppedCollections<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof Old['collections'] as NotInSchema<
		Key,
		New
	>]: StorageCollectionSchema<any, any, any>;
};

type PreservedCollections<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof Old['collections'] as InSchema<
		Key,
		New
	>]: StorageCollectionSchema<any, any, any>;
};

type DroppedCollectionMigrations<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = {
	[Key in keyof DroppedCollections<
		Old,
		New
	>]: DroppedCollectionMigrationStrategy<Old['collections'][Key]>;
};
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

type StrategyFor<
	Key extends string,
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = Key extends New['collections']
	? PreservedCollectionMigrationStrategy<
			Old['collections'][Key],
			New['collections']['key']
	  >
	: DroppedCollectionMigrationStrategy<Old['collections'][Key]>;

type MigrationRunner<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> = <Collection extends Extract<keyof Old['collections'], string>>(
	collection: Collection,
	strategy: StrategyFor<Collection, Old, New>,
) => Promise<void>;

export interface MigrationTools<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
> {
	migrate: MigrationRunner<Old, New>;
	identity: <T>(val: T) => T;
	info: {
		changedCollections: string[];
		addedCollections: string[];
		removedCollections: string[];
	};
}

interface MigrationEngine {
	migrate: (
		collection: string,
		strategy: MigrationStrategy<any, any>,
	) => Promise<void>;
}

export function migrate<
	Old extends StorageSchema<any>,
	New extends StorageSchema<any>,
>(
	oldSchema: Old,
	newSchema: New,
	procedure: (tools: MigrationTools<Old, New>) => void | Promise<void>,
): Migration {
	// diff to determine changed collections
	const changedCollections: string[] = Object.keys(
		newSchema.collections,
	).filter(
		(key) =>
			stableStringify(oldSchema.collections[key]) !==
			stableStringify(newSchema.collections[key]),
	);
	const removedCollections: string[] = Object.keys(
		oldSchema.collections,
	).filter((key) => !newSchema.collections[key]);
	const addedCollections = Object.keys(newSchema.collections).filter(
		(key) => !oldSchema.collections[key],
	);

	const addedIndexes: Record<string, MigrationIndexDescription[]> = {};
	const removedIndexes: Record<string, MigrationIndexDescription[]> = {};
	for (const changed of changedCollections) {
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
		}
		if (removed.length > 0) {
			removedIndexes[changed] = removed;
		}
	}

	return {
		version: newSchema.version,
		migrate: async (engine: MigrationEngine) => {
			const migratedCollections: string[] = [];
			await procedure({
				migrate: async (collection, strategy) => {
					await engine.migrate(collection, strategy);
					migratedCollections.push(collection);
				},
				identity: (val: any) => val,
				info: {
					changedCollections,
					addedCollections,
					removedCollections,
				},
			});

			const unmigrated = changedCollections.filter(
				(collection) => !migratedCollections.includes(collection),
			);
			if (unmigrated.length > 0) {
				console.error('Unmigrated changed collections:', unmigrated);
			}
			console.info(`
        ⬆️ v${newSchema.version} Migration complete. Here's the rundown:
          - Added collections: ${addedCollections.join(', ')}
          - Removed collections: ${removedCollections.join(', ')}
          - Changed collections: ${changedCollections.join(', ')}
          - New indexes: ${Object.keys(addedIndexes)
						.map((col) => addedIndexes[col].map((i) => `${col}.${i.name}`))
						.flatMap((i) => i)
						.join(', ')}
          - Removed indexes: ${Object.keys(removedIndexes)
						.map((col) => addedIndexes[col].map((i) => `${col}.${i.name}`))
						.flatMap((i) => i)
						.join(', ')}
      `);
		},
		removedCollections,
		addedIndexes,
		removedIndexes,
		allCollections: Object.keys(newSchema.collections),
		changedCollections,
		addedCollections,
		oldSchema,
		newSchema,
	};
}

export interface MigrationIndexDescription {
	name: string;
	unique: boolean;
	multiEntry: boolean;
}

export interface Migration {
	version: number;
	oldSchema: StorageSchema<any>;
	newSchema: StorageSchema<any>;
	migrate: (engine: MigrationEngine) => Promise<void>;
	addedCollections: string[];
	removedCollections: string[];
	allCollections: string[];
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
) {
	if (!collection) return [];
	const fields = Object.keys(collection.fields)
		.filter((key) => collection.fields[key].indexed)
		.map((key) => ({
			name: key,
			unique: collection.fields[key].unique,
			multiEntry: collection.fields[key].type === 'array',
		}));

	return [
		...fields,
		...Object.keys(collection.synthetics).map((key) => ({
			name: key,
			unique: collection.synthetics[key].unique,
			multiEntry: collection.synthetics[key].type === 'array',
		})),
		...Object.keys(collection.compounds).map((key) => ({
			name: key,
			unique: collection.compounds[key].unique,
			multiEntry: collection.compounds[key].of.some(
				(fieldName: string) =>
					(collection.fields[fieldName] || collection.synthetics[fieldName])
						.type === 'array',
			),
		})),
	];
}

export function createDefaultMigration(
	newSchema: StorageSchema<any>,
): Migration {
	return migrate(
		{ version: 0, collections: {} } as StorageSchema<any>,
		newSchema,
		async ({ migrate, identity, info }) => {
			console.debug('Running default migration for', info.changedCollections);
			for (const collection of info.changedCollections) {
				await migrate(collection, identity);
			}
		},
	);
}
