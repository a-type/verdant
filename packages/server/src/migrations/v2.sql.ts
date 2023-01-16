// fixes primary key for document baselines to include libraryId

export default `
  ALTER TABLE
    DocumentBaseline RENAME TO DocumentBaselineOld;

  CREATE TABLE DocumentBaseline (
    oid TEXT NOT NULL,
    snapshot TEXT,
    timestamp TEXT NOT NULL,
    libraryId TEXT NOT NULL,
    PRIMARY KEY (libraryId, oid)
  );

  INSERT INTO
    DocumentBaseline
  SELECT
    oid,
    snapshot,
    timestamp,
    libraryId
  FROM
    DocumentBaselineOld;

  DROP TABLE DocumentBaselineOld;
`;
