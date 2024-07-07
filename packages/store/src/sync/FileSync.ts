import { FileData } from '@verdant-web/common';
import { ServerSyncEndpointProvider } from './ServerSyncEndpointProvider.js';

export interface FileUploadResult {
	success: boolean;
	retry: boolean;
	error?: string;
}

export type FilePullResult =
	| {
			success: true;
			data: FileData;
	  }
	| {
			success: false;
			retry: boolean;
			error?: any;
	  };

export class FileSync {
	private endpointProvider: ServerSyncEndpointProvider;
	private log: (...args: any[]) => any;

	constructor({
		endpointProvider,
		log,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		log: (...args: any[]) => any;
	}) {
		this.endpointProvider = endpointProvider;
		this.log = log;
	}

	uploadFile = async (data: FileData): Promise<FileUploadResult> => {
		const file = data.file;

		if (!file) {
			throw new Error('Cannot upload a non-local file');
		}

		// multipart upload
		const { files: fileEndpoint, token } =
			await this.endpointProvider.getEndpoints();

		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await fetch(fileEndpoint + `/${data.id}`, {
				method: 'POST',
				body: formData,
				credentials: 'include',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				this.log('info', 'File upload successful');
				return {
					success: true,
					retry: false,
				};
			} else {
				const responseText = await response.text();
				this.log('error', 'File upload failed', response.status, responseText);
				return {
					success: false,
					retry: response.status >= 500,
					error: `Failed to upload file: ${response.status} ${responseText}`,
				};
			}
		} catch (e) {
			this.log('error', 'File upload failed', e);
			return {
				success: false,
				retry: true,
				error: (e as Error).message,
			};
		}
	};

	getFile = async (id: string): Promise<FilePullResult> => {
		const { files: fileEndpoint, token } =
			await this.endpointProvider.getEndpoints();

		try {
			const response = await fetch(fileEndpoint + `/${id}`, {
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				return {
					success: true,
					data,
				};
			} else {
				this.log(
					'error',
					'File information fetch failed',
					response.status,
					await response.text(),
				);
				return {
					success: false,
					retry: response.status >= 500 || response.status === 404,
				};
			}
		} catch (e) {
			this.log('error', 'File information fetch failed', e);
			return {
				success: false,
				error: e,
				retry: true,
			};
		}
	};
}
