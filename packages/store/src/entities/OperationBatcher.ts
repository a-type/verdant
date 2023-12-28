import {
	Batcher,
	Operation,
	generateId,
	getOidRoot,
	getUndoOperations,
	groupPatchesByOid,
} from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
import { Context } from '../context.js';
import type { EntityStore } from './EntityStore.js';
import { Entity } from './Entity.js';

const DEFAULT_BATCH_KEY = '@@default';

export interface OperationBatch {
	run: (fn: () => void) => this;
	/** @deprecated - use commit() */
	flush: () => Promise<void>;
	commit: () => Promise<void>;
	discard: () => void;
}

export class OperationBatcher {
	private batcher;
	private currentBatchKey = DEFAULT_BATCH_KEY;
	private defaultBatchTimeout: number;
	private meta;
	private ctx;
	private entities;

	constructor({
		batchTimeout = 200,
		meta,
		ctx,
		entities,
	}: {
		batchTimeout?: number;
		meta: Metadata;
		ctx: Context;
		entities: EntityStore;
	}) {
		this.meta = meta;
		this.ctx = ctx;
		this.entities = entities;
		this.defaultBatchTimeout = batchTimeout;
		this.batcher = new Batcher<Operation, { undoable?: boolean }>(
			this.flushOperations,
		);
		this.batcher.add({
			key: DEFAULT_BATCH_KEY,
			items: [],
			max: 100,
			timeout: batchTimeout,
			userData: { undoable: true },
		});
	}

	get isDefaultBatch() {
		return this.currentBatchKey === DEFAULT_BATCH_KEY;
	}

	private flushOperations = async (
		operations: Operation[],
		batchKey: string,
		meta: { undoable?: boolean },
	) => {
		this.ctx.log(
			'debug',
			'Flushing',
			operations.length,
			'operations from batch',
			batchKey,
			'to storage / sync',
		);
		if (!operations.length) return;
		// rewrite timestamps of all operations to now - this preserves
		// the linear history of operations which are sent to the server.
		// even if multiple batches are spun up in parallel and flushed
		// after delay, the final operations in each one should reflect
		// when the batch flushed, not when the changes were made.
		// This also corresponds to user-observed behavior, since unconfirmed
		// operations are applied universally after confirmed operations locally,
		// so even operations which were made before a remote operation but
		// have not been confirmed yet will appear to come after the remote one
		// despite the provisional timestamp being earlier
		// NOTE: this MUST be mutating the original operation object! this timestamp
		// also serves as a unique ID for deduplication later.
		for (const op of operations) {
			op.timestamp = this.meta.now;
		}
		await this.commitOperations(operations, meta);
	};

	/**
	 * Immediately flushes operations to storage / sync.
	 * Providing source to second arg skips hydrating related
	 * Entity from storage, which is useful when that Entity
	 * isn't in storage (i.e. still creating) or just to speed
	 * up the commit.
	 */
	commitOperations = async (
		operations: Operation[],
		meta: { undoable?: boolean; source?: Entity },
	) => {
		if (!operations.length) return;
		// now is the time to decide on what the undo operations will
		// look like, based on the confirmed view of the related entities.
		if (meta.undoable) {
			const undo = await this.createUndo({
				ops: operations,
				source: meta.source,
			});
			if (undo) this.ctx.undoHistory.addUndo(undo);
		}
		// ship it out to EntityStore to compute final snapshots
		// write to storage and refresh entities and queries
		await this.entities.addData({
			operations,
			baselines: [],
			isLocal: true,
		});
	};

	/**
	 * Adds operations to the active batch.
	 */
	addOperations = (operations: Operation[]) => {
		if (!operations.length) return;
		this.batcher.add({
			key: this.currentBatchKey,
			items: operations,
		});
		this.ctx.log(
			`debug`,
			'added',
			operations.length,
			'ops to batch',
			this.currentBatchKey,
			', size = ',
			this.batcher.getSize(this.currentBatchKey),
		);
	};

	batch = ({
		undoable = true,
		batchName = generateId(),
		max = null,
		timeout = this.defaultBatchTimeout,
	}: {
		undoable?: boolean;
		batchName?: string;
		max?: number | null;
		timeout?: number | null;
	} = {}): OperationBatch => {
		const internalBatch = this.batcher.add({
			key: batchName,
			max,
			timeout,
			items: [],
			userData: { undoable },
		});
		const externalApi = {
			run: (fn: () => void) => {
				// while the provided function runs, operations are forwarded
				// to the new batch instead of default. this relies on the function
				// being synchronous.
				this.currentBatchKey = batchName;
				fn();
				this.currentBatchKey = DEFAULT_BATCH_KEY;
				return externalApi;
			},
			commit: async () => {
				// before running a batch, the default operations must be flushed
				// this better preserves undo history behavior...
				// if we left the default batch open while flushing a named batch,
				// then the default batch would be flushed after the named batch,
				// and the default batch could contain operations both prior and
				// after the named batch. this would result in a confusing undo
				// history where the first undo might reverse changes before and
				// after a set of other changes.
				await this.batcher.flush(DEFAULT_BATCH_KEY);
				return internalBatch.flush();
			},
			flush: () => externalApi.commit(),
			discard: () => {
				this.batcher.discard(batchName);
			},
		};
		return externalApi;
	};

	flushAll = () => Promise.all(this.batcher.flushAll());

	private createUndo = async (data: { ops: Operation[]; source?: Entity }) => {
		// this can't be done on-demand because we rely on the current
		// state of the entities to calculate the inverse operations.
		const inverseOps = await this.getInverseOperations(data);

		if (!inverseOps.length) return null;

		return async () => {
			const redo = await this.createUndo({
				ops: inverseOps,
				source: data.source,
			});
			// set time to now for all undo operations, they're happening now.
			for (const op of inverseOps) {
				op.timestamp = this.meta.now;
			}
			await this.commitOperations(
				inverseOps,
				// undos should not generate their own undo operations
				// since they already calculate redo as the inverse.
				{ undoable: false },
			);
			return redo;
		};
	};
	private getInverseOperations = async ({
		ops,
		source,
	}: {
		ops: Operation[];
		source?: Entity;
	}) => {
		const grouped = groupPatchesByOid(ops);
		const inverseOps: Operation[] = [];
		const getNow = () => this.meta.now;
		await Promise.all(
			Object.entries(grouped).map(async ([oid, patches]): Promise<void> => {
				const entity = source ?? (await this.entities.hydrate(getOidRoot(oid)));
				// TODO: this is getting the rebased baseline? how? are ops being submitted early?
				const viewData = entity?.__getViewData__(oid, 'confirmed');
				if (!viewData) {
					this.ctx.log(
						'warn',
						'could not find entity',
						oid,
						'for undo operation',
						ops,
					);
					return;
				}
				const inverse = getUndoOperations(oid, viewData.view, patches, getNow);
				inverseOps.unshift(...inverse);
			}),
		);
		return inverseOps;
	};
}
