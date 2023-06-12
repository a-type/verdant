import {
	applyPatch,
	assignOid,
	cloneDeep,
	compareTimestampSchemaVersions,
	DocumentBaseline,
	EventSubscriber,
	ObjectIdentifier,
	Operation,
	StorageFieldSchema,
} from '@verdant-web/common';
import { Entity, refreshEntity, StoreTools } from './Entity.js';
import type { EntityStore } from './EntityStore.js';
import { WeakRef } from './FakeWeakRef.js';
import { Context } from '../context.js';
import { TaggedOperation } from '../types.js';

/**
 * Local operations: operations on this client that haven't
 * yet been synced and are only applied in-memory. These are
 * always applied after all other operations, they are conceptually
 * 'in the future' as they are not yet synced or stored.
 *
 * Confirmed operations: operations that have been synced and
 * stored in the database.
 *
 * Unconfirmed operations: operations received from sync which
 * have not been stored yet and are only in memory. These exist
 * because new incoming operations are synchronously applied to
 * cached entities while storage goes on async.
 */
export class DocumentFamilyCache extends EventSubscriber<
	Record<`change:${string}`, () => void> & {
		'change:*': (oid: ObjectIdentifier) => void;
	}
> {
	readonly oid: ObjectIdentifier;
	private operationsMap: Map<ObjectIdentifier, TaggedOperation[]>;
	private localOperationsMap: Map<ObjectIdentifier, Operation[]>;
	private baselinesMap: Map<ObjectIdentifier, DocumentBaseline>;

	private entities: Map<ObjectIdentifier, WeakRef<Entity>> = new Map();

	private context;
	private storeTools: StoreTools;

	constructor({
		oid,
		store,
		context,
	}: {
		oid: ObjectIdentifier;
		store: EntityStore;
		context: Context;
	}) {
		super();
		this.oid = oid;
		this.operationsMap = new Map();
		this.localOperationsMap = new Map();
		this.baselinesMap = new Map();
		this.storeTools = {
			addLocalOperations: store.addLocalOperations,
			patchCreator: store.meta.patchCreator,
			addFile: store.files.add,
			getFile: store.files.get,
			time: store.meta.time,
			now: store.meta.now,
		};
		this.context = context;
	}

	insertLocalOperations = (operations: Operation[]) => {
		const oidSet = new Set<ObjectIdentifier>();
		for (const operation of operations) {
			const { oid } = operation;
			oidSet.add(oid);
			const existingOperations = this.localOperationsMap.get(oid) || [];
			existingOperations.push(operation);
			this.localOperationsMap.set(oid, existingOperations);
		}
		for (const oid of oidSet) {
			const entityRef = this.entities.get(oid);
			const entity = entityRef?.deref();
			if (entity) {
				refreshEntity(entity, { isLocal: true });
				this.emit(`change:${oid}`);
				this.emit('change:*', oid);
			}
		}
	};

	insertOperations = (
		operations: TaggedOperation[],
		info: {
			isLocal: boolean;
			affectedOids?: Set<ObjectIdentifier>;
		},
	) => {
		for (const operation of operations) {
			const { oid } = operation;
			info.affectedOids?.add(oid);
			const existingOperations = this.operationsMap.get(oid) || [];
			// insert in order of timestamp
			const index = existingOperations.findIndex(
				(op) => op.timestamp >= operation.timestamp,
			);
			// ensure the operation doesn't already exist in this position
			if (index !== -1) {
				if (existingOperations[index].timestamp === operation.timestamp) {
					continue;
				}
				existingOperations.splice(index, 0, operation);
			} else {
				existingOperations.push(operation);
			}
			this.operationsMap.set(oid, existingOperations);

			// FIXME: seems inefficient
			const unconfirmedOperations = this.localOperationsMap.get(oid);
			if (unconfirmedOperations) {
				this.localOperationsMap.set(
					oid,
					unconfirmedOperations.filter(
						(op) => op.timestamp !== operation.timestamp,
					),
				);
			}
		}
	};

	/**
	 * Insert new baselines for objects in this family.
	 * Automatically drops operations before the new baseline.
	 */
	insertBaselines = (
		baselines: DocumentBaseline[],
		{
			affectedOids,
		}: { isLocal: boolean; affectedOids?: Set<ObjectIdentifier> },
	) => {
		for (const baseline of baselines) {
			const { oid } = baseline;
			// opt out if our baseline is newer.
			const existing = this.baselinesMap.get(oid);
			if (existing?.timestamp && existing.timestamp >= baseline.timestamp) {
				continue;
			}

			affectedOids?.add(oid);
			this.baselinesMap.set(oid, baseline);
			// drop operations before the baseline
			const ops = this.operationsMap.get(oid) || [];
			while (ops[0]?.timestamp < baseline.timestamp) {
				ops.shift();
			}
		}
	};

	addData = ({
		operations,
		baselines,
		reset,
		isLocal,
	}: {
		operations: TaggedOperation[];
		baselines: DocumentBaseline[];
		reset?: boolean;
		isLocal?: boolean;
	}) => {
		if (reset) {
			this.operationsMap.clear();
			this.baselinesMap.clear();
		}
		const info = {
			isLocal: isLocal || false,
			affectedOids: new Set<ObjectIdentifier>(),
		};
		this.insertBaselines(baselines, info);
		// for reset scenario, don't immediately update entities;
		// we will update all of them in one go.
		this.insertOperations(operations, info);
		if (reset) {
			for (const entityRef of this.entities.values()) {
				const entity = entityRef.deref();
				if (entity) {
					refreshEntity(entity, info);
				}
			}
		} else {
			for (const oid of info.affectedOids) {
				const entityRef = this.entities.get(oid);
				const entity = entityRef?.deref();
				if (entity) {
					refreshEntity(entity, info);
					this.emit(`change:${oid}`);
					this.emit('change:*', oid);
				}
			}
		}
	};

	private applyOperations = (
		view: any,
		deleted: boolean,
		operations: Operation[],
		after?: string,
	): {
		view: any;
		deleted: boolean;
		empty: boolean;
	} => {
		let futureSeen: string | undefined = undefined;
		const now = this.storeTools.now;
		for (const operation of operations) {
			if (after && operation.timestamp <= after) {
				continue;
			}
			if (compareTimestampSchemaVersions(operation.timestamp, now) > 0) {
				// we don't apply patches from future versions
				futureSeen = operation.timestamp;
				continue;
			}
			if (operation.data.op === 'delete') {
				deleted = true;
			} else {
				view = applyPatch(view, operation.data);
				if (operation.data.op === 'initialize') {
					deleted = false;
				}
			}
		}
		if (futureSeen) {
			this.context.globalEvents.emit('futureSeen', futureSeen);
		}
		return { view, deleted, empty: !view && !operations.length };
	};

	computeView = (oid: ObjectIdentifier) => {
		const confirmed = this.computeConfirmedView(oid);
		const unconfirmedOperations = this.localOperationsMap.get(oid) || [];
		if (confirmed.empty && !unconfirmedOperations.length) {
			this.context.log(
				'debug',
				`Entity ${oid} accessed with no local data at all`,
			);
			return { view: null, deleted: true, lastTimestamp: null };
		}
		let { view, deleted } = this.applyOperations(
			confirmed.view,
			confirmed.deleted,
			unconfirmedOperations,
		);
		if (view) {
			assignOid(view, oid);
		}
		return { view, deleted, lastTimestamp: this.getLastTimestamp(oid) };
	};

	computeConfirmedView = (
		oid: ObjectIdentifier,
	): {
		view: any;
		deleted: boolean;
		empty: boolean;
	} => {
		const baseline = this.baselinesMap.get(oid);
		const operations = this.operationsMap.get(oid) || [];
		const snapshot = cloneDeep(baseline?.snapshot || undefined);
		const result = this.applyOperations(
			snapshot,
			!snapshot,
			operations,
			baseline?.timestamp,
		);
		if (result.view) {
			assignOid(result.view, oid);
		}
		if (result.empty) {
			this.context.log(
				'debug',
				`Entity ${oid} accessed with no confirmed data`,
			);
		}
		return result;
	};

	getLastTimestamp = (oid: ObjectIdentifier) => {
		let operations = this.localOperationsMap.get(oid);
		if (!operations?.length) {
			operations = this.operationsMap.get(oid) || [];
		}
		let logicalTimestamp: string | null = null;
		if (operations.length) {
			logicalTimestamp = operations[operations.length - 1]?.timestamp;
		} else {
			logicalTimestamp = this.baselinesMap.get(oid)?.timestamp ?? null;
		}
		if (!logicalTimestamp) return null;
		return this.storeTools.time.getWallClockTime(logicalTimestamp);
	};

	getEntity = (
		oid: ObjectIdentifier,
		schema: StorageFieldSchema,
		parent?: Entity,
	): Entity => {
		let entityRef = this.entities.get(oid);
		let entity = entityRef?.deref();
		if (!entity) {
			entity = new Entity({
				oid,
				cache: this,
				fieldSchema: schema,
				store: this.storeTools,
				parent,
			});

			// immediately add to cache and queue a removal if nobody subscribed
			this.entities.set(oid, new WeakRef(entity));
		}

		return entity as any;
	};

	hasOid = (oid: ObjectIdentifier) => {
		return this.operationsMap.has(oid) || this.baselinesMap.has(oid);
	};

	dispose = () => {
		this.entities.forEach((entity) => entity.deref()?.dispose());
		this.entities.clear();
	};

	reset = (
		operations: TaggedOperation[],
		baselines: DocumentBaseline[],
		/**
		 * Whether to drop operations which are only in-memory. Unconfirmed operations
		 * will not be restored from storage until they are persisted, so it's not advisable
		 * to use this unless the intention is to completely clear the entities.
		 */
		dropUnconfirmed = false,
	) => {
		const info = { isLocal: false, affectedOids: new Set<ObjectIdentifier>() };
		this.baselinesMap = new Map(
			baselines.map((baseline) => [baseline.oid, baseline]),
		);
		if (dropUnconfirmed) {
			this.operationsMap = new Map();
		} else {
			// clear out all confirmed operations, leaving only unconfirmed
			// which have been added in memory but not yet persisted in storage
			for (const oid of this.operationsMap.keys()) {
				this.operationsMap.set(
					oid,
					this.operationsMap.get(oid)?.filter((op) => !op.confirmed) ?? [],
				);
			}
		}
		this.insertOperations(operations, info);
		for (const oid of this.entities.keys()) {
			const entityRef = this.entities.get(oid);
			const entity = entityRef?.deref();
			if (entity) {
				refreshEntity(entity, info);
				this.emit(`change:${oid}`);
				this.emit('change:*', oid);
			}
		}
	};
}
