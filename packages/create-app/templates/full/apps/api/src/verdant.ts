import { prisma } from '@{{todo}}/prisma';
import { Server, UserProfiles, LocalFileStorage } from '@verdant-web/server';
import { Server as HttpServer } from 'http';
import {
	verdantDbFile,
	verdantFileStorageRoot,
	verdantSecret,
	serverHost,
} from './config.js';

class Profiles
	implements
		UserProfiles<{
			id: string;
			name: string;
			imageUrl: string | null;
		}>
{
	get = async (userId: string) => {
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (user) {
			return {
				id: user.id,
				name: user.name,
				imageUrl: user.imageUrl,
			};
		} else {
			return {
				id: userId,
				name: 'Anonymous',
				imageUrl: null,
			};
		}
	};
}

export function attachVerdantServer(httpServer: HttpServer) {
	const verdant = new Server({
		httpServer,
		databaseFile: verdantDbFile,
		tokenSecret: verdantSecret,
		profiles: new Profiles(),
		replicaTruancyMinutes: 7 * 24 * 60,
		fileStorage: new LocalFileStorage({
			rootDirectory: verdantFileStorageRoot,
			host: serverHost,
		}),
	});

	verdant.on('error', console.error);

	return verdant;
}
