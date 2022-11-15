import {
	applyPatch,
	cloneDeep,
	DocumentBaseline,
	EventSubscriber,
	ObjectIdentifier,
	Operation,
	removeOid,
	StorageFieldSchema,
} from '@lo-fi/common';
import { Entity, EntityBase, ListEntity, ObjectEntity } from './Entity.js';
import type { EntityStore } from './EntityStore.js';

export class DocumentFamilyCache extends EventSubscriber<
	Record<`change:${string}`, () => void> & {
		'change:*': (oid: ObjectIdentifier) => void;
	}
> {
	readonly oid: ObjectIdentifier;
	private operationsMap: Map<ObjectIdentifier, Operation[]>;
	private unconfirmedOperationsMap: Map<ObjectIdentifier, Operation[]>;
	private baselinesMap: Map<ObjectIdentifier, DocumentBaseline>;

	private entities: Map<ObjectIdentifier, EntityBase<any>> = new Map();

	private store: EntityStore;

	constructor({
		oid,
		baselines,
		operations,
		store,
	}: {
		oid: ObjectIdentifier;
		baselines: DocumentBaseline[];
		operations: Operation[];
		store: EntityStore;
	}) {
		super();
		this.oid = oid;
		this.operationsMap = new Map();
		this.unconfirmedOperationsMap = new Map();
		this.baselinesMap = new Map(
			baselines.map((baseline) => [baseline.oid, baseline]),
		);
		this.store = store;
		this.insertOperations(operations);
	}

	insertUnconfirmedOperations = (operations: Operation[]) => {
		const oidSet = new Set<ObjectIdentifier>();
		for (const operation of operations) {
			const { oid } = operation;
			oidSet.add(oid);
			const existingOperations = this.unconfirmedOperationsMap.get(oid) || [];
			existingOperations.push(operation);
			this.unconfirmedOperationsMap.set(oid, existingOperations);
		}
		for (const oid of oidSet) {
			this.emit(`change:${oid}`);
			this.emit('change:*', oid);
		}
	};

	insertOperations = (operations: Operation[]) => {
		const oidSet = new Set<ObjectIdentifier>();
		for (const operation of operations) {
			const { oid } = operation;
			oidSet.add(oid);
			const existingOperations = this.operationsMap.get(oid) || [];
			this.operationsMap.set(oid, [...existingOperations, operation]);

			// FIXME: seems inefficient
			const unconfirmedOperations = this.unconfirmedOperationsMap.get(oid);
			if (unconfirmedOperations) {
				this.unconfirmedOperationsMap.set(
					oid,
					unconfirmedOperations.filter(
						(op) => op.timestamp !== operation.timestamp,
					),
				);
			}
		}
		for (const oid of oidSet) {
			this.emit(`change:${oid}`);
			this.emit('change:*', oid);
		}
	};

	insertBaseline = (baseline: DocumentBaseline) => {
		const { oid } = baseline;
		this.baselinesMap.set(oid, baseline);
		// drop operations before the baseline
		const ops = this.operationsMap.get(oid) || [];
		while (ops[0]?.timestamp < baseline.timestamp) {
			ops.shift();
		}
	};

	private applyOperations = (
		view: any,
		deleted: boolean,
		operations: Operation[],
	) => {
		for (const operation of operations) {
			if (operation.data.op === 'delete') {
				deleted = true;
			} else {
				view = applyPatch(view, operation.data);
				if (operation.data.op === 'initialize') {
					deleted = false;
				}
			}
		}
		return { view, deleted };
	};

	computeView = (oid: ObjectIdentifier) => {
		const confirmed = this.computeConfirmedView(oid);
		const unconfirmedOperations = this.unconfirmedOperationsMap.get(oid) || [];
		let { view, deleted } = this.applyOperations(
			confirmed.view,
			confirmed.deleted,
			unconfirmedOperations,
		);
		if (view) {
			removeOid(view);
		}
		return { view, deleted };
	};

	computeConfirmedView = (oid: ObjectIdentifier) => {
		const baseline = this.baselinesMap.get(oid);
		const operations = this.operationsMap.get(oid) || [];
		let view = cloneDeep(baseline?.snapshot || undefined);
		return this.applyOperations(view, true, operations);
	};

	getEntity = (oid: ObjectIdentifier, schema: StorageFieldSchema): Entity => {
		let entity = this.entities.get(oid);
		if (!entity) {
			const { view } = this.computeView(oid);
			// FIXME: I dont' like this
			const isList = Array.isArray(view) || (!view && schema.type === 'array');
			if (isList) {
				entity = new ListEntity({
					oid,
					cache: this,
					cacheEvents: this.cacheEvents,
					fieldSchema: schema,
					store: this.store,
				});
			} else {
				entity = new ObjectEntity({
					oid,
					cache: this,
					cacheEvents: this.cacheEvents,
					fieldSchema: schema,
					store: this.store,
				});
			}
			// immediately add to cache and queue a removal if nobody subscribed
			this.entities.set(oid, entity);
			this.enqueueCacheRemoval(oid);
		}

		return entity as any;
	};

	hasOid = (oid: ObjectIdentifier) => {
		return this.operationsMap.has(oid) || this.baselinesMap.has(oid);
	};

	private onSubscribed = (entity: EntityBase<any>) => {};

	private onAllUnsubscribed = (entity: EntityBase<any>) => {
		this.enqueueCacheRemoval(entity.oid);
	};

	private cacheEvents = {
		onSubscribed: this.onSubscribed,
		onAllUnsubscribed: this.onAllUnsubscribed,
	};

	private enqueueCacheRemoval = (oid: ObjectIdentifier) => {
		setTimeout(() => {
			if (!this.entities.get(oid)?.subscriberCount) {
				this.entities.delete(oid);
			}
		}, 1000);
	};

	dispose = () => {
		this.entities.forEach((entity) => entity.dispose());
		this.entities.clear();
	};
}
