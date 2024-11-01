export interface FilesystemImplementation {
	writeFile: (path: string, data: Blob) => Promise<void>;
	readDirectory: (path: string) => Promise<string[]>;
	copyDirectory: (options: { from: string; to: string }) => Promise<void>;
	copyFile: (options: { from: string; to: string }) => Promise<void>;
	deleteFile: (path: string) => Promise<void>;
	readFile: (path: string) => Promise<Blob>;
}
