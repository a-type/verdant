export default `
ALTER TABLE
  ReplicaInfo RENAME TO ReplicaInfoOld;

CREATE TABLE ReplicaInfo (
  id TEXT NOT NULL,
  libraryId TEXT NOT NULL,
  clientId TEXT NOT NULL,
  lastSeenWallClockTime INTEGER,
  ackedLogicalTime TEXT,
  type INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, libraryId)
);

INSERT INTO
  ReplicaInfo
SELECT
  id,
  libraryId,
  clientId,
  lastSeenWallClockTime,
  ackedLogicalTime,
  type
FROM
  ReplicaInfoOld;

DROP TABLE ReplicaInfoOld;
`;
