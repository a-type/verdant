import { FileStorage } from './files/FileStorage.js';
import { SingleNodeLibraryManager } from './libraries/singleNode.js';
import { Logger } from './logger.js';
import { UserProfileLoader, UserProfiles } from './Profiles.js';
import { StorageFactory } from './storage/Storage.js';
import { TokenVerifier } from './TokenVerifier.js';

export function createVerdant({
	profiles: profilesSource,
	storage,
	tokenSecret,
	disableRebasing,
	fileStorage,
	log,
	__testMode,
}: {
	profiles: UserProfiles<any>;
	storage: StorageFactory;
	tokenSecret: string;
	disableRebasing?: boolean;
	fileStorage?: FileStorage;
	log?: Logger;
	__testMode?: boolean;
}) {
	const tokenVerifier = new TokenVerifier({ secret: tokenSecret });
	const profiles = new UserProfileLoader(profilesSource);
	return new SingleNodeLibraryManager({
		profiles,
		storage,
		tokenVerifier,
		disableRebasing,
		fileStorage,
		log,
		__testMode,
	});
}

export type VerdantCore = ReturnType<typeof createVerdant>;
