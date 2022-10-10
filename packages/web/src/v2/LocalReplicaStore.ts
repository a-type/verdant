import cuid from 'cuid';
import { IDBService } from './IDBService.js';

type LocalReplicaInfo = {
	type: 'localReplicaInfo';
	id: string;
	ackedLogicalTime: string | null;
	lastSyncedLogicalTime: string | null;
};

export class LocalReplicaStore extends IDBService {
	private cached: LocalReplicaInfo | undefined;

	get = async () => {
		if (this.cached) {
			return this.cached;
		}

		const db = this.db;
		const lookup = await this.run<LocalReplicaInfo>('info', (store) =>
			store.get('localReplicaInfo'),
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
			await this.run('info', (store) => store.add(replicaInfo), 'readwrite');
			this.cached = replicaInfo;
			return replicaInfo;
		}

		this.cached = lookup;
		return lookup;
	};

	update = async (data: Partial<LocalReplicaInfo>) => {
		const localReplicaInfo = await this.get();
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
