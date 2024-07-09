function random() {
	return Math.random().toString(36).substring(7);
}

export function randomOperations(libraryId: string, count = 10) {
	return Array.from({ length: count }, (_, i) => ({
		oid: `oid-${i}-${random()}`,
		timestamp: `timestamp-${i}-${random()}`,
		data: `data-${i}-${random()}`,
		serverOrder: i,
		replicaId: `replicaId-${i}`,
		libraryId,
		authz: null,
	}));
}

export function randomBaselines(libraryId: string, count = 10) {
	return Array.from({ length: count }, (_, i) => ({
		oid: `oid-${i}-${random()}`,
		snapshot: `snapshot-${i}-${random()}`,
		timestamp: `timestamp-${i}-${random()}`,
		libraryId,
		authz: null,
	}));
}

export function randomFileMetadata(libraryId: string, count = 10) {
	return Array.from({ length: count }, (_, i) => ({
		libraryId,
		fileId: `fileId-${i}-${random()}`,
		name: `name-${i}-${random()}`,
		type: `type-${i}`,
		pendingDeleteAt: i,
	}));
}

export function randomReplicaInfo(libraryId: string, count = 10) {
	return Array.from({ length: count }, (_, i) => ({
		libraryId,
		id: `replicaId-${i}`,
		clientId: `clientId-${i}-${random()}`,
		lastSeenWallClockTime: i,
		ackedLogicalTime: `ackedLogicalTime-${i}-${random()}`,
		type: i,
		ackedServerOrder: i,
	}));
}
