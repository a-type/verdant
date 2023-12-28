// delete all DocumentBaselines where snapshot = NULL
export const sql = `
  ALTER TABLE
    DocumentBaseline
  ADD COLUMN serverOrder INTEGER DEFAULT 0 NOT NULL;
`;
