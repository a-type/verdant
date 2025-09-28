import { ClientMessage, VerdantError } from '@verdant-web/common';
import { Hono } from 'hono';
import { Readable } from 'stream';
import { SingleNodeMicroserverManager } from '../../microservers/singleNode.js';
import { errorHandler } from './errorHandler.js';
import { tokenMiddleware } from './tokenMiddleware.js';

export function createHonoRouter(core: SingleNodeMicroserverManager) {
	const mw = tokenMiddleware(core.tokenVerifier);
	const app = new Hono<any>()
		.onError(errorHandler)
		.use('*', async (c, next) => {
			core.log('debug', 'Incoming request', {
				method: c.req.method,
				path: c.req.path,
			});
			await next();
		})
		.post('/', mw, async (ctx) => {
			const key = ctx.get('key');
			const info = ctx.get('tokenInfo');

			const microserver = await core.get(info.libraryId);

			const finish = microserver.onRequest?.(key, ctx.req.raw, info);

			const body = (await ctx.req.json()) as
				| { messages: ClientMessage[] }
				| null
				| undefined;

			if (!body?.messages) {
				throw new VerdantError(
					VerdantError.Code.BodyRequired,
					undefined,
					'Invalid request body',
				);
			}

			for (const message of body.messages) {
				await microserver.handleMessage(key, info, message);
			}

			const res = finish();

			return res;
		})
		.post('/files/:fileId', mw, async (ctx) => {
			const info = ctx.get('tokenInfo');

			const id = ctx.req.param('fileId');
			if (!id) {
				throw new VerdantError(
					VerdantError.Code.NotFound,
					undefined,
					'Supply a file ID as a path parameters',
				);
			}

			// TODO: remove this once I figure out why request file body parsing is
			// hanging indefinitely.
			if (core.__testMode) {
				const microserver = await core.get(info.libraryId);

				core.log(
					'warn',
					'TEST MODE: FILE WILL NOT BE WRITTEN',
					'\n',
					'This Verdant server was launched in Test Mode. This is only meant for use',
					'in automated testing environments. The file just uploaded WILL NOT be',
					'stored on disk or retrievable.',
				);
				// Fake a file upload for testing
				await microserver.uploadFile(
					new Readable({
						read() {
							this.push('test');
							this.push(null);
						},
					}),
					{
						id,
						libraryId: info.libraryId,
						fileName: 'test.txt',
						type: 'text/plain',
					},
				);
				return ctx.json({ success: true }, 200);
			}

			const form = await ctx.req.parseBody();
			const file = form.file;
			if (!file || !(file instanceof File)) {
				throw new VerdantError(
					VerdantError.Code.InvalidRequest,
					undefined,
					'No file was uploaded to the `file` form key',
				);
			}

			const microserver = await core.get(info.libraryId);

			const fileStream = file.stream();
			await microserver.uploadFile(fileStream, {
				id,
				libraryId: info.libraryId,
				fileName: file.name,
				type: file.type,
			});

			return ctx.json({ success: true }, 200);
		})
		.get('/files/:fileId', mw, async (ctx) => {
			const info = ctx.get('tokenInfo');

			const id = ctx.req.param('fileId');
			if (!id) {
				throw new VerdantError(
					VerdantError.Code.NotFound,
					undefined,
					'Supply a file ID as a path parameters',
				);
			}

			const microserver = await core.get(info.libraryId);

			const file = await microserver.getFileInfo(id);
			if (!file) {
				throw new VerdantError(
					VerdantError.Code.NotFound,
					undefined,
					`File with ID ${id} not found`,
				);
			}

			return ctx.json(file, 200);
		});
	return app;
}
