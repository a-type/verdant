import {
	OperationHistoryRow,
	DocumentBaselineRow,
	FileMetadataRow,
	ReplicaInfoRow,
} from '../../sql/tables.js';

function random() {
	return Math.random().toString(36).substring(7);
}

export function randomOperations(libraryId: string) {
	return Array.from({ length: 10 }, (_, i) => ({
		oid: `oid-${i}-${random()}`,
		timestamp: `timestamp-${i}-${random()}`,
		data: `data-${i}-${random()}`,
		serverOrder: i,
		replicaId: `replicaId-${i}`,
		libraryId,
	}));
}

export function randomBaselines(libraryId: string) {
	return Array.from({ length: 10 }, (_, i) => ({
		oid: `oid-${i}-${random()}`,
		snapshot: `snapshot-${i}-${random()}`,
		timestamp: `timestamp-${i}-${random()}`,
		libraryId,
	}));
}

export function randomFileMetadata(libraryId: string) {
	return Array.from({ length: 10 }, (_, i) => ({
		libraryId,
		fileId: `fileId-${i}-${random()}`,
		name: `name-${i}-${random()}`,
		type: `type-${i}`,
		pendingDeleteAt: i,
	}));
}

export function randomReplicaInfo(libraryId: string) {
	return Array.from({ length: 10 }, (_, i) => ({
		libraryId,
		id: `replicaId-${i}`,
		clientId: `clientId-${i}-${random()}`,
		lastSeenWallClockTime: i,
		ackedLogicalTime: `ackedLogicalTime-${i}-${random()}`,
		type: i,
		ackedServerOrder: i,
	}));
}
