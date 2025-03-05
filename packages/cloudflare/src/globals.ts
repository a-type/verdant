import { FileStorage, UserProfiles } from '@verdant-web/server';

const errorProxy = new Proxy(
	{},
	{
		get(target, prop) {
			throw new Error(
				`VerdantObject not initialized. Call configureVerdant() first.`,
			);
		},
	},
);

export interface VerdantGlobalContext {
	tokenSecret: string;
	disableRebasing?: boolean;
	fileStorage: FileStorage;
	log?: (level: string, ...args: any[]) => void;
	profiles: UserProfiles<any>;
	storageOptions?: {
		fileDeleteExpirationDays?: number;
		replicaTruancyTimeout?: number;
	};
}

export const globalContext: VerdantGlobalContext = errorProxy as any;

export function configureVerdant(config: VerdantGlobalContext) {
	Object.assign(globalContext, config);
}
