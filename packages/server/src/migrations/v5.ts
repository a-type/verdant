import {
	convertLegacyOid,
	replaceLegacyOidsInJsonString,
} from '@verdant-web/common';
import SQL from 'better-sqlite3';

// read all operations and write them back without legacy IDs.
export const procedure = (db: SQL.Database) => {
	const operations = db
		.prepare(/* sql */ `SELECT * from OperationHistory;`)
		.all();
	for (const op of operations) {
		db.prepare(
			/* sql */ `
    UPDATE OperationHistory
      SET oid = ?,
          data = ?
      WHERE oid = ? AND timestamp = ? AND libraryId = ?;
    `,
		).run(
			convertLegacyOid(op.oid),
			// data is already a string, so just leave it and do the conversion on the string
			op.data ? replaceLegacyOidsInJsonString(op.data) : op.data,
			op.oid,
			op.timestamp,
			op.libraryId,
		);
	}
	const baselines = db
		.prepare(/* sql */ `SELECT * from DocumentBaseline;`)
		.all();
	for (const baseline of baselines) {
		db.prepare(
			/* sql */ `
    UPDATE DocumentBaseline
      SET oid = ?,
          snapshot = ?
      WHERE oid = ? AND libraryId = ?;
    `,
		).run(
			convertLegacyOid(baseline.oid),
			baseline.snapshot
				? replaceLegacyOidsInJsonString(baseline.snapshot)
				: baseline.snapshot,
			baseline.oid,
			baseline.libraryId,
		);
	}
};
