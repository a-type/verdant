// add server order to replicas and operations

export const sql = `
  ALTER TABLE ReplicaInfo ADD COLUMN ackedServerOrder INTEGER DEFAULT 0 NOT NULL;
  ALTER TABLE OperationHistory ADD COLUMN serverOrder INTEGER DEFAULT 0 NOT NULL;
`;
