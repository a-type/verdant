import { Client } from './client/Client.js';
import Zip from 'jszip';
import { ExportData } from './metadata/Metadata.js';
import { ReturnedFileData } from './files/FileStorage.js';

export async function createClientBackup(client: Client) {
	const exportData = await client.export();
	const zipFile = new Zip();
	zipFile.file('data.json', JSON.stringify(exportData.data));
	zipFile.file('fileData.json', JSON.stringify(exportData.fileData));
	const folder = zipFile.folder('files');
	if (!folder) {
		throw new Error('Failed to create files folder');
	}
	for (const file of exportData.files) {
		folder.file(file.name, file);
	}
	return zipFile.generateAsync({ type: 'blob' });
}

export async function readBackupFile(file: Blob) {
	const zipFile = await Zip.loadAsync(file);
	const data = await zipFile.file('data.json')?.async('text');
	const fileData = await zipFile.file('fileData.json')?.async('text');
	if (!data || !fileData) {
		throw new Error('Failed to read data from backup');
	}
	const parsedData = JSON.parse(data) as ExportData;
	const parsedFileData = JSON.parse(fileData) as Omit<
		ReturnedFileData,
		'file'
	>[];
	const filesInFilesFolder = Object.entries(zipFile.files).filter(
		([key, val]) => {
			return key.startsWith('files/') && !val.dir;
		},
	);
	let files = new Array<File>();
	if (filesInFilesFolder.length > 0) {
		files = await Promise.all(
			filesInFilesFolder.map(async ([path, f]) => {
				const blob = await f.async('blob');
				return new File([blob], f.name.replace('files/', ''), {
					type: blob.type,
				});
			}),
		);
	}
	const importData = {
		data: parsedData,
		fileData: parsedFileData,
		files,
	};
	return importData;
}

export async function importClientBackup(client: Client, file: Blob) {
	const importData = await readBackupFile(file);
	await client.import(importData);
}
