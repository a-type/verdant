import { VerdantError } from '@verdant-web/common';
import { Context } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export function errorHandler(err: Error, ctx: Context) {
	if (err instanceof VerdantError) {
		if (err.code > VerdantError.Code.Unexpected) {
			console.error('Verdant error:', err);
		}
		return ctx.json(err.toResponse(), err.httpStatus as ContentfulStatusCode);
	}

	console.error('Unexpected error:', err);
	return ctx.json(
		new VerdantError(VerdantError.Code.Unexpected).toResponse(),
		500,
	);
}
