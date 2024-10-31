import { Migration } from '@verdant-web/common';
import { describe, expect, it } from 'vitest';
import { getMigrationPath } from './paths.js';

function mockMigration(from: number, to: number) {
	return {
		oldSchema: {
			version: from,
		},
		newSchema: {
			version: to,
		},
	} as any as Migration;
}

describe('migration pathfinding', () => {
	it('should follow a linear chain', () => {
		const migrations = [
			mockMigration(0, 1),
			mockMigration(1, 2),
			mockMigration(2, 3),
			mockMigration(3, 4),
			mockMigration(4, 5),
		];
		const path = getMigrationPath({
			currentVersion: 0,
			targetVersion: 5,
			migrations,
		});
		expect(path).toEqual(migrations);
	});
	it('should choose the shortest path', () => {
		const migrations = [
			mockMigration(0, 1),
			mockMigration(1, 2),
			mockMigration(2, 3),
			mockMigration(3, 4),
			mockMigration(4, 5),
			mockMigration(0, 5),
		];
		const path = getMigrationPath({
			currentVersion: 0,
			targetVersion: 5,
			migrations,
		});
		expect(path).toEqual([mockMigration(0, 5)]);
	});
	it('should be resilient to dead ends', () => {
		const migrations = [
			mockMigration(0, 1),
			mockMigration(1, 2),
			mockMigration(4, 5),
			mockMigration(5, 6),
			mockMigration(1, 4),
		];
		const path = getMigrationPath({
			currentVersion: 0,
			targetVersion: 6,
			migrations,
		});
		expect(path).toEqual([
			mockMigration(0, 1),
			mockMigration(1, 4),
			mockMigration(4, 5),
			mockMigration(5, 6),
		]);
	});
	it('should error when no path exists to target', () => {
		const migrations = [
			mockMigration(0, 1),
			mockMigration(2, 3),
			mockMigration(3, 4),
			mockMigration(4, 5),
			mockMigration(5, 6),
		];
		expect(() => {
			getMigrationPath({
				currentVersion: 0,
				targetVersion: 6,
				migrations,
			});
		}).toThrow();
	});
	it('should return empty when versions are the same', () => {
		expect(
			getMigrationPath({
				currentVersion: 1,
				targetVersion: 1,
				migrations: [],
			}),
		).toEqual([]);
	});
});
