import {
	applyPatch,
	assignOid,
	isFileRef,
	ObjectIdentifier,
	Ref,
} from '@verdant-web/common';
import { Context } from '../context/context.js';
import { AbstractTransaction, PersistenceMetadataDb } from './interfaces.js';
import type { PersistenceMetadata } from './PersistenceMetadata.js';

export class PersistenceRebaser {
	constructor(
		private db: PersistenceMetadataDb,
		private meta: PersistenceMetadata,
		private ctx: Pick<
			Context,
			'closing' | 'log' | 'time' | 'internalEvents' | 'globalEvents' | 'config'
		>,
	) {}

	/**
	 * Autonomous rebases are only allowed for clients who have never synced. They
	 * keep storage clean for non-syncing clients by compressing history.
	 */
	tryAutonomousRebase = async () => {
		const localReplicaInfo = await this.meta.getLocalReplica();
		if (localReplicaInfo.lastSyncedLogicalTime) return; // cannot autonomously rebase if we've synced
		// but if we have never synced... we can rebase everything!
		this.ctx.log('debug', 'Running autonomous library rebase');
		await this.runRebase(this.ctx.time.now);
	};

	/**
	 * Attempt to autonomously rebase local documents without server intervention.
	 * This can currently only happen for a client who has never synced before.
	 * The goal is to allow local-only clients to compress their history to exactly
	 * their undo stack.
	 */
	private runRebase = async (globalAckTimestamp: string) => {
		if (this.ctx.closing) return;

		await this.db.transaction(
			{
				storeNames: ['baselines', 'operations'],
				mode: 'readwrite',
			},
			async (transaction) => {
				// find all operations before the global ack
				const toRebase = new Set<ObjectIdentifier>();
				let lastTimestamp;
				let operationCount = 0;
				await this.db.iterateAllOperations(
					(patch) => {
						toRebase.add(patch.oid);
						lastTimestamp = patch.timestamp;
						operationCount++;
					},
					{
						before: globalAckTimestamp,
						transaction,
					},
				);

				if (!toRebase.size) {
					return;
				}

				if (this.ctx.closing) {
					return;
				}

				// rebase each affected document
				let newBaselines = [];
				for (const oid of toRebase) {
					newBaselines.push(
						await this.rebase(
							oid,
							lastTimestamp || globalAckTimestamp,
							transaction,
						),
					);
				}
			},
		);
		this.ctx.globalEvents.emit('rebase');
	};

	/**
	 * Debounces rebase attempts to avoid thrashing the database with
	 * rebase operations.
	 */
	scheduleRebase = async (timestamp: string) => {
		if (this.rebaseTimeout) {
			clearTimeout(this.rebaseTimeout);
		}
		this.rebaseTimeout = setTimeout(
			this.runRebase,
			this.ctx.config.persistence?.rebaseTimeout ?? 10000,
			timestamp,
		);
		this.ctx.log('debug', 'Scheduled rebase up to global ack', timestamp);
	};
	private rebaseTimeout: NodeJS.Timeout | null = null;

	private rebase = async (
		oid: ObjectIdentifier,
		upTo: string,
		transaction: AbstractTransaction,
	) => {
		const baseline = await this.db.getBaseline(oid, { transaction });
		let current: any = baseline?.snapshot || undefined;
		let operationsApplied = 0;
		let authz = baseline?.authz;
		const deletedRefs: Ref[] = [];
		await this.db.consumeEntityOperations(
			oid,
			(patch) => {
				// FIXME: this seems like the wrong place to do this
				// but it's here as a safety measure...
				if (!baseline || patch.timestamp > baseline.timestamp) {
					current = applyPatch(current, patch.data, deletedRefs);
					if (patch.data.op === 'initialize') {
						authz = patch.authz;
					}
				}
				// delete all prior operations to the baseline
				operationsApplied++;
			},
			{
				to: upTo,
				transaction,
			},
		);
		if (current) {
			assignOid(current, oid);
		}
		const newBaseline = {
			oid,
			snapshot: current,
			timestamp: upTo,
			authz,
		};
		if (newBaseline.snapshot) {
			await this.db.setBaselines([newBaseline], { transaction });
		} else {
			await this.db.deleteBaseline(oid, { transaction });
		}

		this.ctx.log(
			'debug',
			'rebased',
			oid,
			'up to',
			upTo,
			':',
			current,
			'and deleted',
			operationsApplied,
			'operations',
		);

		// cleanup deleted refs
		if (deletedRefs.length) {
			const fileRefs = deletedRefs.filter(isFileRef);
			if (fileRefs.length) {
				this.ctx.internalEvents.emit('filesDeleted', fileRefs);
			}
		}

		return newBaseline;
	};
}
