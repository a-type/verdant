// add the FileMetadata table

export const sql = `
  CREATE TABLE IF NOT EXISTS FileMetadata (
    libraryId TEXT NOT NULL,
    fileId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    pendingDeleteAt INTEGER,
    PRIMARY KEY (libraryId, fileId)
  );
`;
