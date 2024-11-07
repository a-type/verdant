import { FileData } from '@verdant-web/common';
import { ServerSyncEndpointProvider } from './ServerSyncEndpointProvider.js';
import { Context } from '../context/context.js';
import { Disposable } from '../utils/Disposable.js';

export interface FileUploadResult {
	success: boolean;
	error?: string;
}

export type FilePullResult =
	| {
			success: true;
			data: FileData;
	  }
	| {
			success: false;
			error?: any;
	  };

export class FileSync extends Disposable {
	private endpointProvider: ServerSyncEndpointProvider;
	private ctx;

	constructor({
		endpointProvider,
		ctx,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		ctx: Context;
	}) {
		super();
		this.endpointProvider = endpointProvider;
		this.ctx = ctx;
		this.addDispose(
			ctx.internalEvents.subscribe('fileAdded', this.onFileAdded),
		);
	}

	private onFileAdded = async (data: FileData) => {
		if (data.remote) return;
		this.ctx.log('debug', 'Uploading file', data.id, data.name);
		try {
			await this.uploadFile(data);
			this.ctx.internalEvents.emit(`fileUploaded:${data.id}`, data);
		} catch (e) {
			this.ctx.log('error', 'File upload failed', e);
		}
	};

	/**
	 * Attempts to upload a file to the sync server. Will be retried
	 * according to retry config.
	 */
	uploadFile = async (
		data: FileData,
		retries: { max: number; current: number } = { current: 0, max: 3 },
	): Promise<FileUploadResult> => {
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
			const response = await this.ctx.environment.fetch(
				fileEndpoint + `/${data.id}`,
				{
					method: 'POST',
					body: formData,
					credentials: 'include',
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (response.ok) {
				this.ctx.log('info', 'File upload successful');
				return {
					success: true,
				};
			} else {
				const responseText = await response.text();
				this.ctx.log(
					'error',
					'File upload failed',
					response.status,
					responseText,
				);
				if (response.status < 500 || retries.current >= retries.max) {
					return {
						success: false,
						error: `Failed to upload file: ${response.status} ${responseText}`,
					};
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return this.uploadFile(data, {
					max: retries.max,
					current: retries.current + 1,
				});
			}
		} catch (e) {
			this.ctx.log('error', 'File upload failed', e);
			if (retries.current >= retries.max) {
				return {
					success: false,
					error: (e as Error).message,
				};
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return this.uploadFile(data, {
				max: retries.max,
				current: retries.current + 1,
			});
		}
	};

	/**
	 * Pulls a file from the server by its ID. Will be retried
	 * according to retry config.
	 */
	getFile = async (
		id: string,
		retries: { current: number; max: number } = { current: 0, max: 3 },
	): Promise<FilePullResult> => {
		const { files: fileEndpoint, token } =
			await this.endpointProvider.getEndpoints();

		try {
			const response = await this.ctx.environment.fetch(
				fileEndpoint + `/${id}`,
				{
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (response.ok) {
				const data = await response.json();
				return {
					success: true,
					data,
				};
			} else {
				this.ctx.log(
					'error',
					'File information fetch failed',
					response.status,
					await response.text(),
				);
				if (
					(response.status < 500 && response.status !== 404) ||
					retries.current >= retries.max
				) {
					return {
						success: false,
						error: `Failed to fetch file: ${response.status}`,
					};
				}

				await new Promise((resolve) => setTimeout(resolve, 1000));
				return this.getFile(id, {
					current: retries.current + 1,
					max: retries.max,
				});
			}
		} catch (e) {
			this.ctx.log('error', 'File information fetch failed', e);
			if (retries.current >= retries.max) {
				return {
					success: false,
					error: (e as Error).message,
				};
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
			return this.getFile(id, {
				current: retries.current + 1,
				max: retries.max,
			});
		}
	};
}
