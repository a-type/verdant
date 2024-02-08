import { describe, expect, it } from 'vitest';
import { getFieldDefault } from './fields.js';
import { assignOid, createOid, maybeGetOid } from '../oids.js';
import { fields } from './fieldHelpers.js';

describe('getting field defaults', () => {
	it('does not apply the same oid from the previous application', () => {
		const field = fields.any({
			default: {
				id: '123',
				name: 'test',
			},
		});
		const first = getFieldDefault(field);
		assignOid(first, createOid('test', '1'));
		const second = getFieldDefault(field);
		expect(maybeGetOid(second)).toBe(undefined);
	});

	it('defaults nested fields', () => {
		const field = fields.object({
			default: {},
			properties: {
				foo: {
					type: 'string' as const,
					default: 'bar',
				},
			},
		});
		const defaults = getFieldDefault(field);
		expect(defaults).toEqual({ foo: 'bar' });
	});
});
