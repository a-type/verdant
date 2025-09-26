declare module 'vitest' {
	export interface ProvidedContext {
		SERVER_PORT: string;
	}
}

// mark this file as a module so augmentation works correctly
export {};
