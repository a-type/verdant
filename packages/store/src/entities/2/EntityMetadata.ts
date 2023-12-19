import {
	DocumentBaseline,
	ObjectIdentifier,
	Operation,
	TimestampProvider,
	applyPatch,
	assignOid,
	compareTimestampSchemaVersions,
} from '@verdant-web/common';
import { Context } from '../../context.js';

export type EntityMetadataView = {
	view: any;
	fromOlderVersion: boolean;
	deleted: boolean;
	empty: boolean;
};

export class EntityMetadata {
	private ctx;
	private baseline: DocumentBaseline | null = null;
	// these must be kept in timestamp order.
	private confirmedOperations: Operation[] = [];
	private pendingOperations: Operation[] = [];
	readonly oid;
	private cached: EntityMetadataView | null = null;

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
	computeView = (): EntityMetadataView => {
		// if we've already computed the view, just return it.
		if (this.cached) {
			return this.cached;
		}

		const base = this.baseline?.snapshot ?? undefined;
		let latestTimestamp = this.baseline?.timestamp ?? null;
		const confirmedResult = this.applyOperations(
			// apply ops to baseline
			base,
			// deleted if there's no baseline
			!base,
			// we're applying confirmed ops first
			this.confirmedOperations,
			// latest timestamp is the baseline timestamp, if any
			latestTimestamp,
			// only apply ops after the baseline timestamp
			latestTimestamp,
		);
		latestTimestamp = confirmedResult.latestTimestamp;
		// now's the time to declare we saw the future if we did.
		if (confirmedResult.futureSeen) {
			this.ctx.globalEvents.emit('futureSeen', confirmedResult.futureSeen);
		}
		const pendingResult = this.applyOperations(
			confirmedResult.view,
			confirmedResult.deleted,
			// now we're applying pending operations
			this.pendingOperations,
			// keep our latest timestamp up to date
			latestTimestamp,
			// we don't use after for pending ops, they're all
			// logically in the future
			null,
		);
		// before letting this data out into the wild, we need
		// to associate its oid
		if (pendingResult.view) {
			assignOid(pendingResult.view, this.oid);
		}
		const fromOlderVersion =
			!!latestTimestamp &&
			compareTimestampSchemaVersions(latestTimestamp, this.ctx.getNow()) < 0;
		return {
			view: pendingResult.view,
			deleted: pendingResult.deleted,
			empty: !latestTimestamp,
			fromOlderVersion,
		};
	};

	addBaseline = (baseline: DocumentBaseline): void => {
		this.baseline = baseline;
		// note: setting baseline doesn't clear the cache.
		// this is a convenience performance optimization...
		// a baseline change should never alter the final view.

		// we can now drop any confirmed ops older than the baseline
		this.confirmedOperations = this.confirmedOperations.filter(
			(op) => op.timestamp > baseline.timestamp,
		);
	};

	addConfirmedOperations = (operations: Operation[]): void => {
		// clear the cache
		this.cached = null;
		// the operations must be inserted in timestamp order
		for (const op of operations) {
			const index = this.confirmedOperations.findIndex(
				(o) => o.timestamp >= op.timestamp,
			);
			if (index !== -1) {
				// ensure we don't have a duplicate
				if (this.confirmedOperations[index].timestamp === op.timestamp) {
					continue;
				}
				// otherwise, insert at the right place
				this.confirmedOperations.splice(index, 0, op);
			} else {
				// otherwise, append
				this.confirmedOperations.push(op);
			}
			// FIXME: seems inefficient
			// remove this incoming op from pending if it's in there
			this.pendingOperations = this.pendingOperations.filter(
				(pendingOp) => op.timestamp !== pendingOp.timestamp,
			);
		}
	};

	addPendingOperations = (operations: Operation[]) => {
		// clear the cache
		this.cached = null;
		// we can assume pending ops are always newer
		this.pendingOperations.push(...operations);
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
			// ORIGINAL LOGIC...
			// if (op.data.op === 'delete') {
			//   deleted = true;
			//   continue;
			// }
			// applyPatch(base, op.data);
			// if (op.data.op === 'initialize') {
			//   deleted = false;
			// }
			// WHAT ABOUT...? seems simpler.
			base = applyPatch(base, op.data);
			if (deleted && !!base) {
				deleted = false;
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
