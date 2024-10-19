import { Context, InitialContext } from '../../context/context.js';
import { PersistenceImplementation, PersistenceFileDb } from '../interfaces.js';
import { IdbPersistenceFileDb } from './files/IdbPersistenceFileDb.js';
import { IdbMetadataDb } from './metadata/IdbMetadataDb.js';
import { openMetadataDatabase } from './metadata/openMetadataDatabase.js';
import { IdbQueryDb } from './queries/IdbQueryDb.js';
import { openQueryDatabase } from './queries/migration/openQueryDatabase.js';
import { PersistenceMetadata } from '../PersistenceMetadata.js';
import {
	closeDatabase,
	deleteDatabase,
	getMetadataDbName,
	getNamespaceFromDatabaseInfo,
} from './util.js';

export class IdbPersistence implements PersistenceImplementation {
	private metadataDb: IDBDatabase | undefined;
	constructor(private indexedDB: IDBFactory = window.indexedDB) {}

	getNamespaces = async (): Promise<string[]> => {
		// list all idb database names
		const dbs = await this.indexedDB.databases();
		return Array.from(
			new Set<string>(
				dbs.map(getNamespaceFromDatabaseInfo).filter((n): n is string => !!n),
			),
		);
	};

	deleteNamespace = async (
		namespace: string,
		ctx: InitialContext,
	): Promise<void> => {
		await Promise.all([
			deleteDatabase(getMetadataDbName(namespace), this.indexedDB),
			deleteDatabase([namespace, 'collections'].join('_'), this.indexedDB),
		]);
	};

	openFiles(
		ctx: Omit<Context, 'files' | 'queries'>,
	): Promise<PersistenceFileDb> {
		if (!this.metadataDb) {
			throw new Error(
				'Metadata database must be opened first. This is a bug in Verdant.',
			);
		}
		return Promise.resolve(new IdbPersistenceFileDb(this.metadataDb, ctx));
	}

	openMetadata = async (ctx: InitialContext) => {
		const { db } = await openMetadataDatabase({
			indexedDB: this.indexedDB,
			log: ctx.log,
			namespace: ctx.namespace,
		});
		this.metadataDb = db;
		return new IdbMetadataDb(db, ctx);
	};

	openQueries = async (ctx: InitialContext & { meta: PersistenceMetadata }) => {
		const db = await openQueryDatabase({
			version: ctx.schema.version,
			indexedDB: this.indexedDB,
			migrations: ctx.migrations,
			context: ctx,
		});
		return new IdbQueryDb(db, ctx);
	};

	copyNamespace = async (
		from: string,
		to: string,
		ctx: InitialContext,
	): Promise<void> => {
		const fromCtx = { ...ctx, namespace: from, originalNamespace: from };
		const fromMetaDb = await this.openMetadata(fromCtx);
		const fromMeta = new PersistenceMetadata(fromMetaDb, fromCtx);
		const fromQueries = await this.openQueries({ ...fromCtx, meta: fromMeta });
		ctx.log('info', `Copying data from ${from} to ${to}`);

		const { db: toMetaDb } = await openMetadataDatabase({
			indexedDB: this.indexedDB,
			log: ctx.log,
			namespace: to,
		});
		ctx.log('debug', 'Metadata database opened');
		await fromMetaDb.cloneTo(toMetaDb);
		ctx.log('debug', 'Metadata copied');

		const toQueryDb = await openQueryDatabase({
			version: ctx.schema.version,
			indexedDB: this.indexedDB,
			migrations: ctx.migrations,
			context: { ...ctx, namespace: to, originalNamespace: to, meta: fromMeta },
		});
		await fromQueries.cloneTo(toQueryDb);
		ctx.log('debug', 'Indexes copied');

		await fromMetaDb.dispose();
		await closeDatabase(toMetaDb);
		await fromQueries.dispose();
		await closeDatabase(toQueryDb);
	};
}
