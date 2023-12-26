import cuid from 'cuid';
import { IDBService } from '../IDBService.js';

export type LocalReplicaInfo = {
	type: 'localReplicaInfo';
	id: string;
	ackedLogicalTime: string | null;
	lastSyncedLogicalTime: string | null;
};

export class LocalReplicaStore extends IDBService {
	private _creating: Promise<void> | undefined;
	private cached: LocalReplicaInfo | undefined;

	get = async ({
		transaction,
	}: { transaction?: IDBTransaction } = {}): Promise<LocalReplicaInfo> => {
		if (this.cached) {
			return this.cached;
		}

		const lookup = await this.run<LocalReplicaInfo>(
			'info',
			(store) => store.get('localReplicaInfo'),
			{ transaction },
		);

		// not cached, not in db, create it
		if (!lookup) {
			// prevent a race condition if get() is called again while we are
			// creating the replica info
			if (!this._creating) {
				this._creating = (async () => {
					// create our own replica info now
					const replicaId = cuid();
					const replicaInfo: LocalReplicaInfo = {
						type: 'localReplicaInfo',
						id: replicaId,
						ackedLogicalTime: null,
						lastSyncedLogicalTime: null,
					};
					await this.run('info', (store) => store.put(replicaInfo), {
						mode: 'readwrite',
					});
					this.cached = replicaInfo;
				})();
			}
			await this._creating;

			return this.get({ transaction });
		}

		this.cached = lookup;
		return lookup;
	};

	update = async (
		data: Partial<LocalReplicaInfo>,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		const localReplicaInfo = await this.get({ transaction });
		Object.assign(localReplicaInfo, data);
		await this.run('info', (store) => store.put(localReplicaInfo), {
			mode: 'readwrite',
		});
		this.cached = localReplicaInfo;
	};

	reset = async () => {
		const localInfo = await this.get();
		localInfo.ackedLogicalTime = null;
		localInfo.lastSyncedLogicalTime = null;
		await this.run('info', (store) => store.put(localInfo), {
			mode: 'readwrite',
		});
	};
}
