import { Server, TokenProvider, ReplicaType } from '@verdant/server';
import express from 'express';
import { createServer } from 'http';

const SECRET = 'notsecret';
const HOST = process.env.HOST || 'http://localhost:3000';

const port = 3000;
const app = express();

// allow CORS for all origins
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept',
	);
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});

const httpServer = createServer(app);

const dbFileName = `test-db.sqlite`;

const server = new Server({
	databaseFile: dbFileName,
	tokenSecret: SECRET,
	profiles: {
		get: async (userId) => {
			return { id: userId };
		},
	},
	httpServer,
	// log: (...args) => console.log('[verdant]', ...args),
});

let activeConnections = 0;
server.on('socket-connection', () => {
	activeConnections++;
	console.log('Active connections:', activeConnections);
});
server.on('socket-close', () => {
	activeConnections--;
	console.log('Active connections:', activeConnections);
});

const tokenProvider = new TokenProvider({
	secret: SECRET,
});

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.get('/auth/:library', (req, res) => {
	try {
		const library = req.params.library;
		const user: any = req.query.user || 'anonymous';
		const type: any = req.query.type || ReplicaType.Realtime;
		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			syncEndpoint: `${HOST}/lofi`,
			type,
		});
		res.status(200).json({
			accessToken: token,
		});
	} catch (e) {
		console.error(e);
		res.status(500).json({
			message: (e as any).message,
		});
	}
});

app.post('/lofi', server.handleRequest);

httpServer.listen(port, () => {
	console.log('Server listening on port', port);
});
