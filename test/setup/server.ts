import type { TestProject } from 'vitest/node';
import {
	startCloudflareServer,
	startNodeServer,
} from '../servers/startTestServer.js';

export default async (project: TestProject) => {
	let server: { port: number; cleanup: () => Promise<void> };
	async function startServer() {
		console.log('Project:', project.name);
		if (project.name.startsWith('cf')) {
			return startCloudflareServer();
		} else if (project.name.startsWith('hono')) {
			return startNodeServer();
		} else {
			console.error('Unknown project name:', project.name);
			return { cleanup: () => Promise.resolve(), port: 0 };
		}
	}
	server = await startServer();
	project.provide('SERVER_PORT', server.port.toString());
	project.onTestsRerun(async () => {
		console.log('Shutting down test server...');
		await server.cleanup();
		console.log('Restarting test server...');
		server = await startServer();
		project.provide('SERVER_PORT', server.port.toString());
	});
	return () => {
		return server.cleanup();
	};
};
