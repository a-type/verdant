import { Migration } from '@verdant-web/common';

export function getMigrationPath({
	currentVersion,
	targetVersion,
	migrations,
}: {
	currentVersion: number;
	targetVersion: number;
	migrations: Migration[];
}) {
	const path = getNextPathStep({
		currentVersion,
		targetVersion,
		migrations,
	});
	if (!path) {
		throw new Error(
			`No migration path found from ${currentVersion} to ${targetVersion}! This is a bug. If you're seeing this, contact the developer and provide them with the full contents of this message.`,
		);
	}
	return path;
}

function getNextPathStep({
	currentVersion,
	targetVersion,
	migrations,
}: {
	currentVersion: number;
	targetVersion: number;
	migrations: Migration[];
}): Migration[] | null {
	if (currentVersion === targetVersion) {
		return [];
	}

	const fromHere = migrations
		.filter((m) => m.oldSchema.version === currentVersion)
		.sort((a, b) => b.newSchema.version - a.newSchema.version);

	// keep trying next steps, starting from the largest step,
	// until we find one that leads to the target version down the line
	while (fromHere.length > 0) {
		const next = fromHere.shift()!;
		// this one goes too far (probably never relevant, but still)
		if (next.newSchema.version > targetVersion) {
			return null;
		}
		// exact match - we're done, return the path
		if (next.newSchema.version === targetVersion) {
			return [next];
		}
		// look ahead a down the line. do we reach the target? if so,
		// we choose this path.
		const nextPath = getNextPathStep({
			currentVersion: next.newSchema.version,
			targetVersion,
			migrations,
		});
		if (nextPath) {
			return [next, ...nextPath];
		}

		// otherwise, try the next one with a smaller increment
	}

	// no paths from here match at all! if another layer is calling this one,
	// it will fallback to its next longest step. otherwise there may
	// be no paths at all...
	return null;
}
