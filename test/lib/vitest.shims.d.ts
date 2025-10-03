declare module 'vitest' {
	export interface ProvidedContext {
		SERVER_PORT: string;
		USE_SQLITE: boolean;
	}
}

// mark this file as a module so augmentation works correctly
export {};
