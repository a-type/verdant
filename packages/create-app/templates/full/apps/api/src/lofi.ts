import { prisma } from '@{{todo}}/prisma';
import { Server, UserProfiles, LocalFileStorage } from '@lo-fi/server';
import { Server as HttpServer } from 'http';
import { lofiDbFile, lofiFileStorageRoot, lofiSecret, serverHost } from './config.js';

class Profiles implements UserProfiles<{
  id: string;
  name: string;
  imageUrl: string | null;
}> {
  get = async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });
    if (user) {
      return {
        id: user.id,
        name: user.name,
        imageUrl: user.imageUrl,
      }
    } else {
      return {
        id: userId,
        name: 'Anonymous',
        imageUrl: null
      }
    }
  }
}

export function attachLofiServer(httpServer: HttpServer) {
  const lofi = new Server({
    httpServer,
    databaseFile: lofiDbFile,
    tokenSecret: lofiSecret,
    profiles: new Profiles(),
    replicaTruancyMinutes: 7 * 24 * 60,
    fileStorage: new LocalFileStorage({
      rootDirectory: lofiFileStorageRoot,
      host: serverHost
    }),
  });

  lofi.on('error', console.error);

  return lofi;
}
