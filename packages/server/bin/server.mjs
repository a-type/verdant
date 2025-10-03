#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import minimist from 'minimist';
import {
	createHttpRouter,
	createNodeWebsocketHandler,
} from '../dist/esm/adapters/node/index.js';
import {
	createVerdant,
	LocalFileStorage,
	ReplicaType,
	TokenProvider,
} from '../dist/esm/index.js';
import { sqlShardStorage } from '../dist/esm/storage/index.js';

const argv = minimist(process.argv.slice(1));

const PORT = argv.port || argv.p || process.env.VERDANT_PORT || 3242;
const SECRET =
	argv.secret || process.env.VERDANT_SECRET || 'notsecretnotsecretnotsecret';

const tokenProvider = new TokenProvider({
	secret: SECRET,
});

// the "core" is a service API for interacting with libraries.
// you could plug this into your own HTTP or other kind of interface,
// but further on are some Hono-based tools to help get started.
const core = createVerdant({
	// SQLite databases for each library are stored in this directory
	storage: sqlShardStorage({
		databasesDirectory: 'verdant-dbs',
	}),
	// implement .get to retrieve detailed profile information for sync users
	profiles: {
		get: async (userId) => {
			// you could fetch a profile record from a database here to augment
			// this profile with name, image, etc.
			// values will be cached, so don't worry too much about timing.
			return { id: userId };
		},
	},
	// required to validate sync access tokens generated from
	// your API
	tokenSecret: SECRET,
	// optional; enables file sync
	fileStorage: new LocalFileStorage({
		rootDirectory: 'verdant-files',
		// this matches an API you must host (see below)
		host: `http://localhost:${PORT}/files`,
		log: (level, ...args) => console.log(level, ...args),
	}),
	// optional logger
	log: (level, ...args) => console.log(level, ...args),
});

// our verdant router will be mounted to a subpath
// and handle all HTTP sync requests
const verdantRouter = createHttpRouter(core);

// this is "your" app -- Verdant lives in it,
// but you control the API.
const app = new Hono()
	.use('*', async (c, next) => {
		// simple request logger
		console.log(`${c.req.method} ${c.req.url}`);
		await next();
	})
	.use(
		'*',
		cors({
			origin: (o) => o,
			credentials: true,
			allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
		}),
	)
	.route('/verdant', verdantRouter)
	// issue sync tokens
	.get('/auth/:libraryId', async (ctx) => {
		// here you authenticate your user, authorize
		// their access to a particular library, and
		// issue a token.
		const library = ctx.req.param('libraryId');

		const user = ctx.req.query('userId');
		const type = ctx.req.query('type') || ReplicaType.Realtime;

		// remember to check that the user is allowed to sync
		// to this library

		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			// this subpath matches the verdantRouter mount
			syncEndpoint: `http://localhost:${PORT}/verdant`,
			type,
		});
		return ctx.json({
			accessToken: token,
		});
	})
	// (optional) serve uploaded files
	// if you use LocalFileStorage
	.get(
		'/files/*',
		serveStatic({
			root: 'verdant-files',
			rewriteRequestPath: (path) => path.replace('/files/', ''),
		}),
	);

const server = serve({
	fetch: app.fetch,
	port: parseInt(PORT.toString(), 10),
});

// handle websocket sync! must be done like this, not included
// in createHttpRouter!
const onUpgrade = createNodeWebsocketHandler(core);
server.addListener('upgrade', onUpgrade);

server.addListener('listening', () => {
	console.log(`🌿 Verdant standalone server listening on port ${PORT}`);
	console.log(``);
	console.log(
		`Never use this server in production. It's a convenient way to test syncing locally, but has no authorization.`,
	);
	console.log(``);
	console.log(
		`To connect your client, import \`cliSync\` and pass \`cliSync(<libraryId>)\` to \`sync\`, or supply "http://localhost:${PORT}/auth/<libraryId>?userId=<userId>" to sync.authEndpoint.`,
	);
	console.log(
		`<libraryId> and <userId> are up to you and your app. Clients on the same library ID will sync data.`,
	);
});
