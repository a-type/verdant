import type { TestProject } from 'vitest/node';
import { startTestServer } from '../servers/startTestServer.js';

export default async (project: TestProject) => {
	let server = await startTestServer();
	project.provide('SERVER_PORT', server.port.toString());
	project.onTestsRerun(async () => {
		await server.cleanup();
		server = await startTestServer();
		project.provide('SERVER_PORT', server.port.toString());
	});
	return () => {
		return server.cleanup();
	};
};
