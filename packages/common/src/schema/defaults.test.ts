import { describe, expect, it } from 'vitest';
import { getFieldDefault } from './defaults.js';
import { assignOid, createOid, getOid, maybeGetOid } from '../oids.js';

describe('getting field defaults', () => {
	it('does not apply the same oid from the previous application', () => {
		const field = {
			type: 'any',
			default: {
				id: '123',
				name: 'test',
			},
		} as const;
		const first = getFieldDefault(field);
		assignOid(first, createOid('test', '1'));
		const second = getFieldDefault(field);
		expect(maybeGetOid(second)).toBe(undefined);
	});
});
