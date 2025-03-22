import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import {
	LocalFileStorage,
	ReplicaType,
	TokenProvider,
	Server as VerdantServer,
} from '@verdant-web/server';
import { sqlShardStorage } from '@verdant-web/server/storage';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { VerdantMediaRendererExtension } from '../../dist/esm/extensions/VerdantMedia.js';
import { attachFileUrls } from '../../dist/esm/server/index.js';

const app = new Hono();
app.use('*', cors({ origin: 'http://localhost:3010', credentials: true }));

const verdant = new VerdantServer({
	storage: sqlShardStorage({
		databasesDirectory: './.databases',
	}),
	tokenSecret: 'notsecretnotsecret',
	fileStorage: new LocalFileStorage({
		host: 'http://localhost:3234/files',
		rootDirectory: './.files',
	}),
});
const tokens = new TokenProvider({ secret: 'notsecretnotsecret' });

const verdantRoutes = new Hono()
	.all('/sync/files/:id', (ctx) => verdant.handleFileFetch(ctx.req.raw))
	.all('/sync', (ctx) => verdant.handleFetch(ctx.req.raw));

app.route('/verdant', verdantRoutes);
app.get(
	'/files/*',
	serveStatic({
		root: './.files',
		onNotFound: (path, c) => {
			console.error(`File not found: ${path}`);
			return c.json({ error: 'File not found' }, 404);
		},
		rewriteRequestPath: (path) => path.replace('/files', ''),
	}),
);
app.get('/auth/:libraryId', async (ctx) => {
	const { libraryId } = ctx.req.param();
	const { userId } = ctx.req.query();
	const token = tokens.getToken({
		userId,
		libraryId,
		syncEndpoint: `http://localhost:3234/verdant/sync`,
		role: 'user',
		type: ReplicaType.Realtime,
	});
	return ctx.json({ accessToken: token });
});

/**
 * demo: rendering verdant-based tiptap docs to HTML.
 * NOTE: this is mostly for proof of concept purposes. in a real
 * app, you would store the document snapshot and associated library
 * ID in your own database, then expose another endpoint to render
 * it. This endpoint takes the data and immediately renders it to HTML
 * without storing it.
 */
app.post('/render', async (ctx) => {
	const { doc, libraryId } = await ctx.req.json();
	const processed = await attachFileUrls(doc, libraryId, verdant);
	console.log(JSON.stringify(processed, null, 2));
	const html = generateHTML(processed, [
		StarterKit,
		VerdantMediaRendererExtension,
	]);
	return ctx.html(`
		<html>
			<head>
				<style>
					img, video, audio {
						max-width: 100%;
						height: auto;
					}
				</style>
			</head>
			<body>${html}</body>
		</html>
	`);
});

const http = serve({
	fetch: app.fetch,
	port: 3234,
});
verdant.attach(http, { httpPath: false });

http.addListener('listening', () => {
	console.log('Server is running on http://localhost:3234');
});
