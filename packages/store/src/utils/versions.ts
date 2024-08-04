import {
	DocumentBaseline,
	getTimestampSchemaVersion,
	Operation,
} from '@verdant-web/common';

export function getLatestVersion(data: {
	operations: Operation[];
	baselines?: DocumentBaseline[];
}) {
	const timestamps = data.operations
		.map((op) => op.timestamp)
		.concat(data.baselines?.map((b) => b.timestamp) ?? []);
	const latestVersion = timestamps.reduce((v, ts) => {
		const tsVersion = getTimestampSchemaVersion(ts);
		if (tsVersion > v) {
			return tsVersion;
		}
		return v;
	}, 0);

	return latestVersion;
}
