import { describe, expect, it } from 'vitest';
import { joinPaths } from './util.js';

describe('joinPaths', () => {
	it('resolves relative paths to base', () => {
		expect(joinPaths('/foo', 'bar')).toBe('/foo/bar');
	});
	it('eliminates double slashes', () => {
		expect(joinPaths('/foo/', '/bar')).toBe('/foo/bar');
	});
});
