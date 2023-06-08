import { describe, expect, it } from 'vitest';
import { joinPaths } from './util.js';

describe('joinPaths', () => {
	it('resolves relative paths to base', () => {
		expect(joinPaths('/foo', 'bar')).toBe('/foo/bar');
	});
	it('eliminates double slashes', () => {
		expect(joinPaths('/foo/', '/bar')).toBe('/foo/bar');
	});
	it("doesn't mess up relatie paths", () => {
		expect(joinPaths('', 'foo')).toBe('foo');
	});
});
