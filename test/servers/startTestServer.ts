import { spawn } from 'child_process';

export async function startTestServer(): Promise<{
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
				// Server is ready
				console.log(
					'Test server is ready',
					'port',
					data.port,
					'db location',
					data.databaseLocation,
				);
				resolve({
					port: data.port,
					cleanup: () =>
						new Promise<void>((res) => {
							serverProcess.on('exit', () => res());
							serverProcess.kill();
						}),
				});
			}
		});
	});
}
