import { FileInfo, FileStorage } from '@verdant-web/server';
import { Readable } from 'stream';

export class R2FileStorage implements FileStorage {
	private bucket: R2Bucket;
	private host: string;

	constructor({ host, bucket }: { host: string; bucket: R2Bucket }) {
		this.bucket = bucket;
		this.host = host;
	}
	private getDirectory = (data: FileInfo) => {
		return `${data.libraryId}/${data.id}`;
	};
	private getPath = (data: FileInfo) => {
		return `${this.getDirectory(data)}/${data.fileName}`;
	};
	put = async (
		fileStream: Readable | ReadableStream,
		data: FileInfo,
	): Promise<void> => {
		const webStream =
			fileStream instanceof ReadableStream
				? fileStream
				: Readable.toWeb(fileStream);
		await this.bucket.put(this.getPath(data), webStream as any, {
			httpMetadata: {
				contentType: data.type,
			},
			customMetadata: {
				libraryId: data.libraryId,
				fileId: data.id,
				fileName: data.fileName,
			},
		});
	};
	getUrl = async (data: FileInfo): Promise<string> => {
		return this.host + '/' + this.getPath(data);
	};
	delete = async (data: FileInfo): Promise<void> => {
		await this.bucket.delete(this.getPath(data));
	};
}
