import { describe, expect, it } from 'vitest';
import { getInitTypings } from './typings.js';

describe('generated typings', () => {
	describe('init typings', () => {
		it('handles optionals for defaults and nullables', () => {
			expect(
				getInitTypings({
					collection: {
						name: 'test',
						// typings for this function aren't generic so the
						// valid values can't be inferred.
						primaryKey: 'id' as unknown as never,
						fields: {
							id: {
								type: 'string',
								default() {
									return 'id';
								},
							},
							text: {
								type: 'string',
								nullable: true,
							},
							num: {
								type: 'number',
								default: 1,
							},
							required: {
								type: 'string',
							},
						},
					},
				}),
			).toMatchInlineSnapshot(`
				"export type TestInit = {id?: string, text?: string | null, num?: number, required: string};
				"
			`);
		});
	});
});
