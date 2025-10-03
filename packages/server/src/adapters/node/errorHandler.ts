import { VerdantError } from '@verdant-web/common';
import { ErrorHandler } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export const errorHandler: ErrorHandler = (err, ctx) => {
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
};
