import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import cors from 'cors';
import apiRouter from './api/index.js';
import { attachVerdantServer } from './verdant.js';
import { port, uiHost } from './config.js';

const app = express();
const server = createServer(app);

app.use(
	cors({
		origin: [
			uiHost,
			// add more origins to allow requests from here
			process.env.CORS_ALLOW_ORIGIN,
		].filter((o): o is string => !!o),
		credentials: true,
	}),
);
app.use((req, res, next) => {
	// log the request details
	console.log(new Date().toISOString(), req.method, req.url.split('?')[0]);
	next();
});
app.use((req, res, next) => {
	if (req.originalUrl.includes('/webhook')) {
		next();
	} else {
		bodyParser.json({
			limit: '50mb',
		})(req, res, next);
	}
});
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.use('/api', apiRouter);

const lofiServer = attachVerdantServer(server);
app.post('/lo-fi', async (req, res) => {
	await lofiServer.handleRequest(req, res);
});
app.get('/lo-fi', async (req, res) => {
	await lofiServer.handleRequest(req, res);
});
app.post('/lo-fi/files/:fileId', async (req, res) => {
	await lofiServer.handleFileRequest(req, res);
});
app.get('/lo-fi/files/:fileId', async (req, res) => {
	await lofiServer.handleFileRequest(req, res);
});

server.listen(port, () => {
	console.log(`http://localhost:${port}`);
});
