export const version = 1;

export const up = [
	`
CREATE TABLE IF NOT EXISTS "_Migrations" (
	"id" INTEGER PRIMARY KEY,
	"appliedAt" TEXT NOT NULL
);`,
	`
CREATE TABLE IF NOT EXISTS "DocumentBaseline" (
	"oid" TEXT PRIMARY KEY,
	"snapshot" TEXT,
	"timestamp" TEXT NOT NULL
);
`,
	`
CREATE TABLE IF NOT EXISTS "OperationHistory" (
	"oid" TEXT NOT NULL,
	"timestamp" TEXT NOT NULL,
	"data" TEXT NOT NULL,
	"serverOrder" INTEGER NOT NULL DEFAULT 0,
	"replicaId" TEXT NOT NULL,
	PRIMARY KEY ("replicaId", "oid", "timestamp")
);
`,
	`
CREATE TABLE IF NOT EXISTS "ReplicaInfo" (
	"id" TEXT PRIMARY KEY,
	"clientId" TEXT NOT NULL,
	"lastSeenWallClockTime" INTEGER,
	"ackedLogicalTime" TEXT,
	"type" INTEGER NOT NULL DEFAULT 0,
	"ackedServerOrder" INTEGER NOT NULL DEFAULT 0
);`,
	`
CREATE TABLE IF NOT EXISTS "FileMetadata" (
	"fileId" TEXT PRIMARY KEY,
	"name" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"pendingDeleteAt" INTEGER
);
`,
];
