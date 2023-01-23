// add the FileMetadata table

export default `
  CREATE TABLE FileMetadata (
    libraryId TEXT NOT NULL,
    fileId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    PRIMARY KEY (libraryId, fileId)
  );
`;
