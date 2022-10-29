export interface ReplicaInfo {
	id: string;
	ackedLogicalTime: string | null;
}

export const SERVER_REPLICA_ID = 'SERVER';
