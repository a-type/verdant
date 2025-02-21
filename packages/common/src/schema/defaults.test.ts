import { describe, expect, it } from 'vitest';
import { assignOid, createOid, maybeGetOid } from '../oids.js';
import { fields } from './fieldHelpers.js';
import { getFieldDefault } from './fields.js';

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

	it('supports defaults on arrays', () => {
		const field = fields.array({
			items: fields.object({
				fields: {
					foo: fields.string(),
				},
			}),
			default: [{ foo: 'baz' } as { foo: string }],
		});
		const defaults = getFieldDefault(field);
		expect(defaults).toEqual([{ foo: 'baz' }]);
	});

	it('supports defaults on maps', () => {
		const field = fields.map({
			values: fields.object({
				fields: {
					foo: fields.string({ default: 'bar' }),
				},
			}),
			default: { test: { foo: 'baz' } as { foo: string } },
		});
		const defaults = getFieldDefault(field);
		expect(defaults).toEqual({ test: { foo: 'baz' } });
	});
});
