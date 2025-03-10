import { describe, expect, it } from 'vitest';
import { createFileRef } from '../files.js';
import { createRef } from '../oids.js';
import { schema, validateEntityField } from './index.js';

describe('validation', () => {
	it('validates shallowly with refs', () => {
		const fieldSchema = schema.fields.object({
			fields: {
				obj: schema.fields.object({
					fields: {},
				}),
				file: schema.fields.file(),
			},
		});
		expect(
			validateEntityField({
				field: fieldSchema,
				value: {
					obj: createRef('some/id:1'),
					file: createFileRef('somefile'),
				},
				fieldPath: [],
				expectRefs: true,
			}),
		).toBeUndefined();
		expect(
			validateEntityField({
				field: fieldSchema,
				value: {
					obj: createRef('some/id:1'),
					file: createRef('some/object:1'),
				},
				fieldPath: [],
				expectRefs: true,
			}),
		).toMatchInlineSnapshot(`
			{
			  "fieldPath": [
			    "file",
			  ],
			  "message": "Expected file ref for field file, got {"@@type":"ref","id":"some/object:1"}",
			  "type": "invalid-type",
			}
		`);
		expect(
			validateEntityField({
				field: fieldSchema,
				value: {
					obj: 'foo',
					file: createFileRef('somefile'),
				},
				fieldPath: [],
				expectRefs: true,
			}),
		).toMatchInlineSnapshot(`
			{
			  "fieldPath": [
			    "obj",
			  ],
			  "message": "Expected ref for field obj, got "foo"",
			  "type": "invalid-type",
			}
		`);
	});
});
