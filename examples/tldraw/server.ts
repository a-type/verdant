import express from 'express';
import { ReplicaType, Server, TokenProvider } from '@verdant/server';
import { createServer } from 'http';
import * as path from 'path';
// @ts-ignore
import nonce from 'gfynonce';
import { LocalFileStorage } from '@verdant/server/src/files/FileStorage.js';

const PORT = 5050;

const app = express();
/**
 * Open CORS to port 5051
 */
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', 'http://localhost:5051');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization',
	);
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});
app.use(express.json());
const httpServer = createServer(app);

const dbFileName = `tldraw-storage.sqlite`;

// 👋 Replace with a secure value from your environment variables!
const lofiSecret = 'notsecret';

// 👋 This is just some fake user data for fun. Each user gets a random
// name which sticks as long as the server is running. In a real app you'd
// store this kind of stuff in a database.
const users = {} as Record<string, { name: string }>;

const server = new Server({
	databaseFile: dbFileName,
	tokenSecret: lofiSecret,
	// log: console.log,
	fileStorage: new LocalFileStorage({
		host: 'http://localhost:5050/files',
		rootDirectory: 'files',
	}),
	fileConfig: {
		// delete files immediately on all peers disconnecting.
		// you may not want to do this in your app, it's a good idea to hold
		// on to the file for a while in case someone reconnects and
		// undoes the delete.
		deleteExpirationDays: 0,
	},
	profiles: {
		get: async (userId: string) => {
			if (!users[userId]) {
				users[userId] = {
					name: nonce({ adjectives: 1, separator: ' ' }),
				};
			}
			return {
				id: userId,
				name: nonce({ adjectives: 1, separator: ' ' }),
			};
		},
	},
	httpServer,
	log: console.debug,
});
server.on('error', console.error);

const tokenProvider = new TokenProvider({
	secret: lofiSecret,
});

app.get('/auth', async (req, res) => {
	const library = 'default';
	// 👋 Normally this user id would be stored in a session and detected using
	// authentication in your server. For this example app we naively let the
	// client tell us who they are. You shouldn't do that if you care about user
	// impersonation!
	const user = req.query.user as string;
	const token = tokenProvider.getToken({
		libraryId: library,
		userId: user,
		syncEndpoint: `http://localhost:${PORT}/lo-fi`,
		// for this example, we're making replicas passive - if someone disconnects and
		// starts editing history offline, their changes will be dropped on reconnect.
		type: ReplicaType.PassiveRealtime,
	});
	res.json({
		accessToken: token,
	});
});

app.post('/lo-fi', async (req, res) => {
	await server.handleRequest(req, res);
});
app.get('/lo-fi', async (req, res) => {
	await server.handleRequest(req, res);
});
app.post('/lo-fi/files/:fileId', async (req, res) => {
	await server.handleFileRequest(req, res);
});
app.get('/lo-fi/files/:fileId', async (req, res) => {
	await server.handleFileRequest(req, res);
});

app.use('/files', express.static('files'));

httpServer.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
