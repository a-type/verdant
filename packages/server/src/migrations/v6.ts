// delete all DocumentBaselines where snapshot = NULL
export const sql = `
  DELETE FROM DocumentBaseline WHERE snapshot IS NULL;
`
