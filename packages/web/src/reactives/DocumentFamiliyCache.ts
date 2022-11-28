import {
	applyPatch,
	assignOid,
	cloneDeep,
	DocumentBaseline,
	EventSubscriber,
	ObjectIdentifier,
	Operation,
	removeOid,
	StorageFieldSchema,
} from '@lo-fi/common';
import {
	Entity,
	EntityBase,
	ListEntity,
	ObjectEntity,
	refreshEntity,
} from './Entity.js';
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

	private entities: Map<ObjectIdentifier, EntityBase<any, any>> = new Map();

	private store: EntityStore;

	constructor({ oid, store }: { oid: ObjectIdentifier; store: EntityStore }) {
		super();
		this.oid = oid;
		this.operationsMap = new Map();
		this.unconfirmedOperationsMap = new Map();
		this.baselinesMap = new Map();
		this.store = store;
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
			const entity = this.entities.get(oid);
			if (entity) {
				refreshEntity(entity);
				this.emit(`change:${oid}`);
				this.emit('change:*', oid);
			}
		}
	};

	insertOperations = (operations: Operation[]) => {
		const oidSet = new Set<ObjectIdentifier>();
		for (const operation of operations) {
			const { oid } = operation;
			oidSet.add(oid);
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
			const entity = this.entities.get(oid);
			if (entity) {
				refreshEntity(entity);
				this.emit(`change:${oid}`);
				this.emit('change:*', oid);
			}
		}
	};

	insertBaselines = (baselines: DocumentBaseline[]) => {
		for (const baseline of baselines) {
			const { oid } = baseline;
			this.baselinesMap.set(oid, baseline);
			// drop operations before the baseline
			const ops = this.operationsMap.get(oid) || [];
			while (ops[0]?.timestamp < baseline.timestamp) {
				ops.shift();
			}
		}
	};

	addConfirmedData = ({
		operations,
		baselines,
		reset,
	}: {
		operations: Operation[];
		baselines: DocumentBaseline[];
		reset?: boolean;
	}) => {
		if (reset) {
			this.operationsMap.clear();
			this.baselinesMap.clear();
		}
		this.insertBaselines(baselines);
		this.insertOperations(operations);
	};

	private applyOperations = (
		view: any,
		deleted: boolean,
		operations: Operation[],
		after?: string,
	) => {
		for (const operation of operations) {
			if (after && operation.timestamp <= after) {
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
			assignOid(view, oid);
		}
		return { view, deleted };
	};

	computeConfirmedView = (oid: ObjectIdentifier) => {
		const baseline = this.baselinesMap.get(oid);
		const operations = this.operationsMap.get(oid) || [];
		let view = cloneDeep(baseline?.snapshot || undefined);
		view = this.applyOperations(view, !view, operations, baseline?.timestamp);
		if (view) {
			assignOid(view, oid);
		}
		return view;
	};

	getEntity = (
		oid: ObjectIdentifier,
		schema: StorageFieldSchema,
		parent?: EntityBase<any, any>,
	): Entity => {
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
					parent,
				});
			} else {
				entity = new ObjectEntity({
					oid,
					cache: this,
					cacheEvents: this.cacheEvents,
					fieldSchema: schema,
					store: this.store,
					parent,
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

	private onSubscribed = (entity: EntityBase<any, any>) => {};

	private onAllUnsubscribed = (entity: EntityBase<any, any>) => {
		this.enqueueCacheRemoval(entity.oid);
	};

	private cacheEvents = {
		onSubscribed: this.onSubscribed,
		onAllUnsubscribed: this.onAllUnsubscribed,
	};

	private enqueueCacheRemoval = (oid: ObjectIdentifier) => {
		setTimeout(() => {
			if (!this.entities.get(oid)?.hasSubscribers) {
				this.entities.delete(oid);
			}
		}, 1000);
	};

	dispose = () => {
		this.entities.forEach((entity) => entity.dispose());
		this.entities.clear();
	};

	reset = (operations: Operation[], baselines: DocumentBaseline[]) => {
		this.baselinesMap = new Map(
			baselines.map((baseline) => [baseline.oid, baseline]),
		);
		this.operationsMap = new Map();
		this.insertOperations(operations);
		for (const oid of this.entities.keys()) {
			const entity = this.entities.get(oid);
			if (entity) {
				refreshEntity(entity);
				this.emit(`change:${oid}`);
				this.emit('change:*', oid);
			}
		}
	};
}
