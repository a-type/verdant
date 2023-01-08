export default `
CREATE TABLE IF NOT EXISTS ReplicaInfo (
  id TEXT PRIMARY KEY NOT NULL,
  libraryId TEXT NOT NULL,
  clientId TEXT NOT NULL,
  lastSeenWallClockTime INTEGER,
  ackedLogicalTime TEXT,
  type INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS OperationHistory (
  libraryId TEXT NOT NULL,
  replicaId TEXT NOT NULL,
  oid TEXT NOT NULL,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (libraryId, replicaId, oid, timestamp)
);

CREATE TABLE IF NOT EXISTS DocumentBaseline (
  oid TEXT PRIMARY KEY NOT NULL,
  snapshot TEXT,
  timestamp TEXT NOT NULL,
  libraryId TEXT NOT NULL
);
`;
