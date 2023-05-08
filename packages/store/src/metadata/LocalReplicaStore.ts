import cuid from 'cuid';
import { IDBService } from '../IDBService.js';

export type LocalReplicaInfo = {
	type: 'localReplicaInfo';
	id: string;
	ackedLogicalTime: string | null;
	lastSyncedLogicalTime: string | null;
};

export class LocalReplicaStore extends IDBService {
	private cached: LocalReplicaInfo | undefined;

	get = async ({ transaction }: { transaction?: IDBTransaction } = {}) => {
		if (this.cached) {
			return this.cached;
		}

		const lookup = await this.run<LocalReplicaInfo>(
			'info',
			(store) => store.get('localReplicaInfo'),
			undefined,
			transaction,
		);

		if (!lookup) {
			// create our own replica info now
			const replicaId = cuid();
			const replicaInfo: LocalReplicaInfo = {
				type: 'localReplicaInfo',
				id: replicaId,
				ackedLogicalTime: null,
				lastSyncedLogicalTime: null,
			};
			await this.run('info', (store) => store.put(replicaInfo), 'readwrite');
			this.cached = replicaInfo;
			return replicaInfo;
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
		await this.run('info', (store) => store.put(localReplicaInfo), 'readwrite');
		this.cached = localReplicaInfo;
	};

	reset = async () => {
		const localInfo = await this.get();
		localInfo.ackedLogicalTime = null;
		localInfo.lastSyncedLogicalTime = null;
		await this.run('info', (store) => store.put(localInfo), 'readwrite');
	};
}
