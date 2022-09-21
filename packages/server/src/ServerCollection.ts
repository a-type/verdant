import { applyPatch, OperationMessage, SyncOperation } from '@lofi/common';
import { Database } from 'better-sqlite3';
import { Baselines } from './Baselines.js';
import { OperationHistory } from './OperationHistory.js';

export class ServerCollection {
	private operationHistory = new OperationHistory(this.db, this.libraryId);
	private baselines = new Baselines(this.db, this.libraryId);

	constructor(
		private db: Database,
		public readonly libraryId: string,
		public readonly name: string,
	) {}

	/**
	 * Applies an operation, inserting it into the operation history
	 * and recomputing the document snapshot.
	 */
	receive = ({ op }: OperationMessage) => {
		const run = this.db.transaction(() => {
			// insert operation into history for the document
			this.operationHistory.insert({
				id: op.id,
				replicaId: op.replicaId,
				collection: this.name,
				documentId: op.documentId,
				patch: op.patch,
				timestamp: op.timestamp,
			});

			// read operation history for affected document
			const history = this.operationHistory.getAllFor(op.documentId);

			// reapply operations to baseline to reconstruct document -
			// assume empty document if no baseline exists.
			const baseline = this.baselines.get(op.documentId);

			const baselineSnapshot = baseline?.snapshot || {};
			const updatedView = this.applyOperations(baselineSnapshot, history);

			// update document
			this.db
				.prepare(
					`
					INSERT OR REPLACE INTO Document (id, libraryId, collection, snapshot, timestamp)
					VALUES (?, ?, ?, ?, ?)
				`,
				)
				.run(
					op.documentId,
					this.libraryId,
					this.name,
					JSON.stringify(updatedView),
					op.timestamp,
				);
		});

		run();
	};

	private applyOperations = <T>(baseline: T, operations: SyncOperation[]) => {
		let result: T | undefined = baseline;
		for (const operation of operations) {
			result = this.applyOperation(result, operation);
		}

		return result;
	};

	private applyOperation = <T>(baseline: T, operation: SyncOperation) => {
		return applyPatch<T>(baseline, operation.patch);
	};
}

export class ServerCollectionManager {
	private cache = new Map<string, ServerCollection>();

	constructor(private db: Database, public readonly libraryId: string) {}

	open = (name: string) => {
		if (!this.cache.has(name)) {
			this.cache.set(name, new ServerCollection(this.db, this.libraryId, name));
		}

		return this.cache.get(name)!;
	};

	close = (name: string) => {
		this.cache.delete(name);
	};
}
