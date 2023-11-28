import {
	S3Client,
	DeleteObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { FileStorage, FileInfo } from '@verdant-web/server';
import path from 'path/posix';
import { Readable } from 'stream';

export class S3FileStorage implements FileStorage {
	private s3Client: S3Client;
	private bucketName: string;
	private host: string;

	constructor({
		region,
		bucketName,
		host,
	}: {
		region: string;
		bucketName: string;
		host?: string;
	}) {
		const credentials =
			process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
				? {
						accessKeyId: process.env.AWS_ACCESS_KEY_ID,
						secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
				  }
				: undefined;
		this.s3Client = new S3Client({
			region,
			credentials,
		});
		this.bucketName = bucketName;
		this.host = host || `https://s3.amazonaws.com/${bucketName}`;
	}
	private getDirectory = (data: FileInfo) => {
		return `${data.libraryId}/${data.id}`;
	};
	private getPath = (data: FileInfo) => {
		return `${this.getDirectory(data)}/${data.fileName}`;
	};
	put = async (fileStream: Readable, data: FileInfo): Promise<void> => {
		// pipe stream to s3
		const parallelUploads3 = new Upload({
			client: this.s3Client,
			leavePartsOnError: false, // optional manually handle dropped parts
			params: {
				Bucket: this.bucketName,
				Key: this.getPath(data),
				Body: fileStream,
			},
		});

		const result = await parallelUploads3.done();
		if (
			result.$metadata.httpStatusCode &&
			result.$metadata.httpStatusCode >= 300
		) {
			throw new Error(
				`Failed to upload file to S3: ${result.$metadata.httpStatusCode}`,
			);
		}
	};
	getUrl = (data: FileInfo): string => {
		return path.join(this.host, this.getPath(data));
	};
	delete = async (data: FileInfo): Promise<void> => {
		await this.s3Client.send(
			new DeleteObjectCommand({
				Bucket: this.bucketName,
				Key: this.getPath(data),
			}),
		);
	};
}
