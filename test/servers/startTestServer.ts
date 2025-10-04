import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import getPort from 'get-port';
import { resolve } from 'path';

export async function startNodeServer(): Promise<{
	port: number;
	cleanup: () => Promise<void>;
}> {
	const serverProcess = spawn('node', ['node/nodeTestServer.mjs'], {
		cwd: import.meta.dirname,
		stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
	});

	return new Promise((resolve, reject) => {
		serverProcess.on('error', (err) => {
			console.error('Failed to start server process:', err);
			reject(err);
		});

		serverProcess.on('message', (ipcMessage) => {
			const data = JSON.parse(ipcMessage.toString());
			if (data.type === 'ready') {
				const server = {
					port: data.port,
					cleanup: async () => {
						const result = serverProcess.kill();
						if (!result) {
							console.warn('Failed to kill server process, trying SIGINT');
							const secondResult = serverProcess.kill('SIGINT');
							if (!secondResult) {
								console.error('Failed to SIGINT server process');
							}
						}
					},
				};
				process.on('beforeExit', server.cleanup);
				resolve(server);
			}
		});
	});
}

export async function startCloudflareServer(): Promise<{
	port: number;
	cleanup: () => Promise<void>;
}> {
	const port = await getPort();
	// write port to .env, needed so DO knows where to route file requests.
	const envFilePath = resolve(import.meta.dirname, 'cloudflare', '.env');
	const envFileContent = `PORT=${port}\n`;
	await writeFile(envFilePath, envFileContent);

	const serverProcess = spawn('pnpm', ['start', '--port', port.toString()], {
		cwd: resolve(import.meta.dirname, 'cloudflare'),
		stdio: ['inherit', 'pipe', 'pipe'],
	});
	return new Promise((resolve, reject) => {
		serverProcess.on('error', (err) => {
			console.error('Failed to start Cloudflare server process:', err);
			reject(err);
		});

		let stdoutData = '';
		serverProcess.stdout?.on('data', (data) => {
			console.log(`[Cloudflare]: ${data}`);
			stdoutData += data.toString();
			const match = stdoutData.match(/Ready on http:\/\/localhost:(\d+)/);
			if (match) {
				const server = {
					port: parseInt(match[1], 10),
					cleanup: async () => {
						const result = serverProcess.kill();
						if (!result) {
							console.warn('Failed to kill server process, trying SIGINT');
							const secondResult = serverProcess.kill('SIGINT');
							if (!secondResult) {
								console.error('Failed to SIGINT server process');
							}
						}
					},
				};
				process.on('beforeExit', server.cleanup);
				resolve(server);
			}
		});

		serverProcess.stderr?.on('data', (data) => {
			console.error(`[Cloudflare]: ${data}`);
		});
	});
}
