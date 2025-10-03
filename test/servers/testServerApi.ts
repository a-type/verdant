import type { FileInfo } from '@verdant-web/server';
import { inject } from 'vitest';

export interface TestServerApi {
	origin: string;
	port: number;
	getDocumentSnapshot: (
		libraryId: string,
		collection: string,
		documentId: string,
	) => Promise<any | null>;
	getFileInfo: (
		libraryId: string,
		fileId: string,
	) => Promise<(FileInfo & { url: string | null }) | null>;
	evict: (libraryId: string) => Promise<void>;
	info: (libraryId: string) => Promise<any>;
	forceTruant: (libraryId: string, replicaId: string) => Promise<void>;
}

const port = inject('SERVER_PORT');

export const testServerApi: TestServerApi = {
	port: Number(port),
	origin: `http://127.0.0.1:${port}`,
	getDocumentSnapshot: async (libraryId, collection, id) => {
		const res = await fetch(
			`http://127.0.0.1:${port}/libraries/${libraryId}/documents/${collection}/${id}`,
		);
		if (res.status === 200) {
			return res.json();
		}
		return null;
	},
	getFileInfo: async (libraryId, fileId) => {
		const res = await fetch(
			`http://127.0.0.1:${port}/libraries/${libraryId}/files/${fileId}`,
		);
		if (res.status === 200) {
			return res.json();
		}
		return null;
	},
	evict: async (libraryId) => {
		await fetch(`http://127.0.0.1:${port}/libraries/${libraryId}/evict`, {
			method: 'POST',
		});
	},
	info: async (libraryId) => {
		const res = await fetch(`http://127.0.0.1:${port}/libraries/${libraryId}`);
		if (res.status === 200) {
			return res.json();
		}
		return null;
	},
	forceTruant: async (libraryId, replicaId) => {
		await fetch(
			`http://127.0.0.1:${port}/libraries/${libraryId}/replicas/${replicaId}/force-truant`,
			{ method: 'POST' },
		);
	},
};
