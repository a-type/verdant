import {
	DocumentBaseline,
	ObjectIdentifier,
	Operation,
	applyPatch,
	areOidsRelated,
	assert,
	assignOid,
	cloneDeep,
	compareTimestampSchemaVersions,
	getWallClockTime,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { EntityChange } from './types.js';

export type EntityMetadataView = {
	view: any;
	fromOlderVersion: boolean;
	deleted: boolean;
	empty: boolean;
	updatedAt: number;
};

export class EntityMetadata {
	private ctx;
	private baseline: DocumentBaseline | null = null;
	// these must be kept in timestamp order.
	private confirmedOperations: Operation[] = [];
	private pendingOperations: Operation[] = [];
	readonly oid;

	constructor({
		oid,
		ctx,
		confirmedOperations,
		pendingOperations,
		baseline,
	}: {
		oid: ObjectIdentifier;
		ctx: Context;
		confirmedOperations?: Operation[];
		pendingOperations?: Operation[];
		baseline?: DocumentBaseline;
	}) {
		assert(oid, 'oid is required');
		this.ctx = ctx;
		this.oid = oid;
		if (confirmedOperations) {
			this.confirmedOperations = confirmedOperations;
		}
		if (pendingOperations) {
			this.pendingOperations = pendingOperations;
		}
		if (baseline) {
			this.baseline = baseline;
		}
	}

	/**
	 * Compute the current view of the entity.
	 */
	computeView = (omitPending = false): EntityMetadataView => {
		const base = cloneDeep(this.baseline?.snapshot ?? undefined);
		const baselineTimestamp = this.baseline?.timestamp ?? null;
		const confirmedResult = this.applyOperations(
			// apply ops to baseline
			base,
			// deleted if there's no baseline
			!base,
			// we're applying confirmed ops first
			this.confirmedOperations,
			// latest timestamp is the baseline timestamp, if any
			baselineTimestamp,
			// only apply ops after the baseline timestamp
			baselineTimestamp,
		);
		// now's the time to declare we saw the future if we did.
		if (confirmedResult.futureSeen) {
			this.ctx.globalEvents.emit('futureSeen', confirmedResult.futureSeen);
		}
		const pendingResult = omitPending
			? confirmedResult
			: this.applyOperations(
					confirmedResult.view,
					confirmedResult.deleted,
					// now we're applying pending operations
					this.pendingOperations,
					// keep our latest timestamp up to date
					confirmedResult.latestTimestamp,
					// we don't use after for pending ops, they're all
					// logically in the future
					null,
			  );
		// before letting this data out into the wild, we need
		// to associate its oid
		if (pendingResult.view) {
			assignOid(pendingResult.view, this.oid);
		}

		// note whether confirmed data has an operation/baseline from the current
		// schema or not.
		const fromOlderVersion =
			!!confirmedResult.latestTimestamp &&
			compareTimestampSchemaVersions(
				confirmedResult.latestTimestamp,
				this.ctx.getNow(),
			) < 0;

		const empty =
			!this.baseline &&
			!this.pendingOperations.length &&
			!this.confirmedOperations.length;
		if (empty) {
			this.ctx.log('warn', `Tried to load Entity ${this.oid} with no data`);
		}

		const updatedAtTimestamp =
			pendingResult.latestTimestamp ??
			confirmedResult.latestTimestamp ??
			baselineTimestamp;
		const updatedAt = updatedAtTimestamp
			? getWallClockTime(updatedAtTimestamp)
			: 0;

		if (!pendingResult.view && !pendingResult.deleted && !empty) {
			this.ctx.log(
				'warn',
				`Entity ${this.oid} has no view, no deleted flag, and not empty`,
			);
			debugger;
		}

		return {
			view: pendingResult.view ?? undefined,
			deleted: pendingResult.deleted,
			empty,
			fromOlderVersion,
			updatedAt,
		};
	};

	addBaseline = (baseline: DocumentBaseline): void => {
		// opt out if our baseline is newer
		if (this.baseline && this.baseline.timestamp >= baseline.timestamp) {
			return;
		}
		this.baseline = baseline;
		// we can now drop any confirmed ops older than the baseline
		while (this.confirmedOperations[0]?.timestamp < baseline.timestamp) {
			this.confirmedOperations.shift();
		}
	};

	/**
	 * @returns total number of new operations added
	 */
	addConfirmedOperations = (operations: Operation[]): number => {
		let totalAdded = 0;
		// the operations must be inserted in timestamp order
		for (const op of operations) {
			const index = this.confirmedOperations.findIndex(
				(o) => o.timestamp >= op.timestamp,
			);
			if (index !== -1) {
				// ensure we don't have a duplicate
				if (this.confirmedOperations[index].timestamp !== op.timestamp) {
					// otherwise, insert at the right place
					this.confirmedOperations.splice(index, 0, op);
					totalAdded++;
				}
			} else {
				// otherwise, append
				this.confirmedOperations.push(op);
				totalAdded++;
			}
			// FIXME: seems inefficient
			// remove this incoming op from pending if it's in there
			const pendingPrior = this.pendingOperations.length;
			this.discardPendingOperation(op);
			totalAdded -= pendingPrior - this.pendingOperations.length;
		}
		return totalAdded;
	};

	addPendingOperation = (operation: Operation) => {
		// check to see if new operation supersedes the previous one
		// we can assume pending ops are always newer
		this.pendingOperations.push(operation);
	};

	discardPendingOperation = (operation: Operation) => {
		this.pendingOperations = this.pendingOperations.filter(
			(op) => op.timestamp !== operation.timestamp,
		);
	};

	private applyOperations = (
		base: any,
		deleted: boolean,
		operations: Operation[],
		latestTimestamp: string | null,
		after: string | null,
	): {
		view: any;
		latestTimestamp: string | null;
		deleted: boolean;
		futureSeen: string | undefined;
	} => {
		let futureSeen: string | undefined = undefined;
		const now = this.ctx.getNow();
		for (const op of operations) {
			// ignore ops before our after cutoff
			if (after && op.timestamp <= after) {
				continue;
			}
			// don't apply future ops
			if (compareTimestampSchemaVersions(op.timestamp, now) > 0) {
				futureSeen = op.timestamp;
				continue;
			}
			// we don't actually delete the view when a delete op
			// comes in. the view remains useful for calculating
			// undo operations.
			if (op.data.op === 'delete') {
				deleted = true;
			} else {
				base = applyPatch(base, op.data);
				if (op.data.op === 'initialize') {
					deleted = false;
				}
			}

			// track the latest timestamp
			if (!latestTimestamp || op.timestamp > latestTimestamp) {
				latestTimestamp = op.timestamp;
			}
		}
		return {
			view: base,
			latestTimestamp: latestTimestamp ?? null,
			deleted,
			futureSeen,
		};
	};
}

/**
 * Represents the metadata for a group of entities underneath a Document.
 * Metadata is separated out this way so that these classes can be
 * garbage collected when the root Document goes out of scope.
 */
export class EntityFamilyMetadata {
	private ctx;
	private entities: Map<ObjectIdentifier, EntityMetadata> = new Map();
	private onPendingOperations;
	private rootOid: ObjectIdentifier;

	constructor({
		ctx,
		onPendingOperations,
		rootOid,
	}: {
		ctx: Context;
		onPendingOperations: (ops: Operation[]) => void;
		rootOid: ObjectIdentifier;
	}) {
		this.ctx = ctx;
		this.rootOid = rootOid;
		this.onPendingOperations = onPendingOperations;
	}

	get = (oid: ObjectIdentifier) => {
		assert(oid, 'oid is required');
		if (!this.entities.has(oid)) {
			this.entities.set(oid, new EntityMetadata({ oid, ctx: this.ctx }));
		}
		return this.entities.get(oid)!;
	};

	getAllOids = () => {
		return Array.from(this.entities.keys());
	};

	addConfirmedData = ({
		baselines = [],
		operations = {},
		isLocal = false,
	}: {
		baselines?: DocumentBaseline[];
		operations?: Record<ObjectIdentifier, Operation[]>;
		isLocal?: boolean;
	}) => {
		const changes: Record<ObjectIdentifier, EntityChange> = {};
		for (const baseline of baselines) {
			if (!areOidsRelated(this.rootOid, baseline.oid)) {
				throw new Error(
					`Invalid baseline for entity ${this.rootOid}: ` +
						JSON.stringify(baseline),
				);
			}
			this.get(baseline.oid).addBaseline(baseline);
		}
		for (const [oid, ops] of Object.entries(operations)) {
			if (!areOidsRelated(this.rootOid, oid)) {
				throw new Error(
					`Invalid operations for entity ${this.rootOid}: ` +
						JSON.stringify(ops),
				);
			}
			const added = this.get(oid).addConfirmedOperations(ops);
			if (added !== 0) {
				changes[oid] ??= { oid, isLocal };
			}
		}
		return Object.values(changes);
	};

	/**
	 * Adds local, unconfirmed operations to the system.
	 * The API is different here to streamline for the way
	 * local changes are usually handled, as a list.
	 */
	addPendingData = (operations: Operation[]) => {
		const changes: Record<ObjectIdentifier, EntityChange> = {};
		for (const op of operations) {
			this.get(op.oid).addPendingOperation(op);
			changes[op.oid] ??= { oid: op.oid, isLocal: true };
		}
		this.onPendingOperations(operations);
		return Object.values(changes);
	};

	replaceAllData = ({
		operations = {},
		baselines = [],
	}: {
		operations?: Record<ObjectIdentifier, Operation[]>;
		baselines?: DocumentBaseline[];
	}) => {
		const oids = Array.from(this.entities.keys());
		this.entities.clear();
		const changes: Record<ObjectIdentifier, EntityChange> = {};
		// changes apply to all the entities we removed things from, too
		for (const oid of oids) {
			changes[oid] = { oid, isLocal: false };
		}
		for (const baseline of baselines) {
			if (!areOidsRelated(this.rootOid, baseline.oid)) {
				throw new Error(
					`Invalid baseline for entity ${this.rootOid}: ` +
						JSON.stringify(baseline),
				);
			}
			this.get(baseline.oid).addBaseline(baseline);
			changes[baseline.oid] ??= { oid: baseline.oid, isLocal: false };
		}
		for (const [oid, ops] of Object.entries(operations)) {
			if (!areOidsRelated(this.rootOid, oid)) {
				throw new Error(
					`Invalid operations for entity ${this.rootOid}: ` +
						JSON.stringify(ops),
				);
			}
			this.get(oid).addConfirmedOperations(ops);
			changes[oid] ??= { oid, isLocal: false };
		}
		return Object.values(changes);
	};

	discardPendingOperation = (operation: Operation) => {
		const ent = this.entities.get(operation.oid);
		ent?.discardPendingOperation(operation);
	};
}
