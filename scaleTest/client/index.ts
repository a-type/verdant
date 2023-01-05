import cuid from 'cuid';
import { createServer } from 'vite';
import { URL, fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// host the client app
const __dirname = fileURLToPath(new URL('./src', import.meta.url));

createServer({
	// any valid user config options, plus `mode` and `configFile`
	configFile: false,
	root: __dirname,
	server: {
		port: 4000,
	},
	logLevel: 'info',
})
	.then(async (server) => {
		await server.listen();
		return server;
	})
	.then((server) => server.printUrls());

const browser = await puppeteer.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// read api host from argv
const apiHost = process.argv[2];
// read clients from argv
const clientCount = process.argv[3] ? parseInt(process.argv[3], 10) : 1000;

// create N clients. each pair of clients should connect to the same library.
const clients = [];
let library = cuid();
for (let i = 0; i < clientCount; i++) {
	const page = await browser.newPage();
	await page.goto(
		`http://localhost:4000?api_host=${apiHost}&library=${library}`,
	);
	// insert a handler to alert this process if the client goes offline
	await page.exposeFunction('onClientDisconnect', () => {
		console.log('Client disconnected from library', library);
	});
	clients.push(page);

	// create a new library for every 2 clients
	if (i % 2 === 1) {
		library = cuid();
	}
}

// quit if Q is entered in command line
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (data) => {
	if (data.toString() === 'q') {
		browser.close();
		process.exit();
	}
});
console.log('Press Q to quit');
