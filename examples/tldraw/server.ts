import express from 'express';
import { Server, TokenProvider } from '@lo-fi/server';
import { createServer } from 'http';
// @ts-ignore
import nonce from 'gfynonce';

const PORT = 5050;

const app = express();
/**
 * Open CORS to port 5051
 */
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', 'http://localhost:5051');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept',
	);
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});
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
	profiles: {
		get: async (userId: string) => {
			if (!users[userId]) {
				users[userId] = {
					name: nonce({ adjectives: 1, separator: ' ' }),
				};
			}
			return {
				id: userId,
				name: users[userId].name,
			};
		},
	},
	httpServer,
});

const tokenProvider = new TokenProvider({
	secret: lofiSecret,
});

app.get('/auth', async (req, res) => {
	const library = 'default';
	const user = (req.query.user as string) || 'anonymous';
	const token = tokenProvider.getToken({
		libraryId: library,
		userId: user,
		syncEndpoint: `http://localhost:${PORT}/lofi`,
	});
	res.json({
		accessToken: token,
	});
});

app.post('/lofi', server.handleRequest);

app.use(express.static('public'));
app.use(express.static('dist'));

httpServer.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});
