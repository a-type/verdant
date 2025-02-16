#!/usr/bin/env node
import { createReadStream } from 'fs';
import { createServer } from 'http';
import minimist from 'minimist';
import { parse, URLSearchParams } from 'url';
import {
	LocalFileStorage,
	ReplicaType,
	Server,
	TokenProvider,
} from '../dist/esm/index.js';
import { sqlStorage } from '../dist/esm/storage/index.js';

const argv = minimist(process.argv.slice(1));

const PORT = argv.port || argv.p || process.env.VERDANT_PORT || 3242;
const SECRET =
	argv.secret || process.env.VERDANT_SECRET || 'notsecretnotsecretnotsecret';

const tokenProvider = new TokenProvider({ secret: SECRET });

const http = createServer((req, res) => {
	const url = parse(req.url);
	// write cors headers for incoming host
	const origin = req.headers.origin;
	res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Request-Id',
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Max-Age', '86400');
	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	// serve files on the /files path
	if (url.pathname.startsWith('/files/')) {
		const file = decodeURIComponent(url.pathname.slice(7));
		console.log('Serving file', file);
		const fileStream = createReadStream(`files/${file}`);
		fileStream.pipe(res);
		fileStream.on('error', (err) => {
			res.writeHead(404);
			res.end();
		});
		return;
	}

	// provide tokens on the /auth path
	if (url.pathname.startsWith('/auth/')) {
		// userId is provided as a query param
		const params = new URLSearchParams(url.search);
		const userId = params.get('userId');

		// library ID is in path
		const libraryId = url.pathname.slice(6);

		const token = tokenProvider.getToken({
			userId,
			libraryId,
			syncEndpoint: `http://localhost:${PORT}/sync`,
			role: 'user',
			type: ReplicaType.Realtime,
		});
		res.writeHead(200, {
			'Content-Type': 'application/json',
		});
		res.end(JSON.stringify({ accessToken: token }));
		return;
	} else if (url.pathname.startsWith('/sync')) {
		if (url.pathname.startsWith('/sync/files/')) {
			return verdant.handleFileRequest(req, res);
		}
		return verdant.handleRequest(req, res);
	} else {
		res.writeHead(404);
		res.end();
	}
});

const verdant = new Server({
	storage: sqlStorage({
		databaseFile: 'verdant.sqlite',
	}),
	tokenSecret: SECRET,
	fileStorage: new LocalFileStorage({
		rootDirectory: 'files',
		host: `http://localhost:${3242}/files`,
	}),
	profiles: {
		get: (userId) => ({
			id: userId,
		}),
	},
	httpServer: http,
	log: (level, ...rest) => {
		if (process.env.VERDANT_LOG === 'false') {
			return;
		}
		if (level === 'debug' && process.env.VERDANT_DEBUG !== 'true') {
			return;
		}
		console.log(level, ...rest);
	},
});

verdant.on('error', (err) => {
	console.error(err);
});

export default new Promise((resolve) => {
	http.listen(PORT, () => {
		console.log(`🌿 Verdant standalone server listening on port ${PORT}`);
		console.log(``);
		console.log(
			`It's not recommended you use this server in production. It's a convenient way to test syncing locally, but has no authorization.`,
		);
		console.log(``);
		console.log(
			`To connect your client, supply "http://localhost:${PORT}/auth/<libraryId>?userId=<userId>" to sync.authEndpoint.`,
		);
		console.log(
			`<libraryId> and <userId> are up to you and your app. Clients on the same library ID will sync data.`,
		);

		resolve({
			httpServer: http,
			verdant,
		});
	});
});
