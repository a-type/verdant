import { Client } from './client/Client.js';
import Zip from 'jszip';
import { ExportData } from './metadata/Metadata.js';
import { ReturnedFileData } from './files/FileStorage.js';

// narrow type to just what's needed
type BackupClient = Pick<Client, 'export' | 'import' | 'namespace'>;

export async function createClientBackup(client: BackupClient) {
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

export async function importClientBackup(client: BackupClient, file: Blob) {
	const importData = await readBackupFile(file);
	await client.import(importData);
}

/**
 * Call this function in the app codebase which allows transfer to another origin
 * to advertise the transfer.
 */
export function advertiseTransferTo(client: BackupClient, destination: string) {
	// listen for 'transfer-accepted' and send transfer
	window.addEventListener('message', (event) => {
		if (event.data.type === 'transfer-accepted') {
			if (event.origin != destination) {
				console.error(
					`Received transfer message from unexpected origin: ${event.origin}`,
				);
				return;
			}
			console.info('Transfer accepted by', event.origin);

			createClientBackup(client).then((file) => {
				const message = {
					type: 'transfer',
					file,
				};
				event.source?.postMessage(message, {
					targetOrigin: event.origin,
				});
				console.info('Transfer sent');
			});
		}
	});

	console.log('Advertising transfer to', destination);
	const message = {
		type: 'transfer-available',
	};
	window.parent.postMessage(message, {
		targetOrigin: destination,
	});
}

/**
 * Call this function in the app codebase which allows transfer from another origin
 * to accept the transfer.
 */
export function acceptTransferFrom(
	client: BackupClient,
	origin: string,
	onComplete?: () => void,
) {
	console.log('Open to accepting transfer from', origin);
	const frame = document.createElement('iframe');
	frame.src = `${origin}`;
	frame.style.display = 'none';

	// listen for 'transfer-available' and begin transfer
	window.addEventListener('message', async (event) => {
		if (event.data.type === 'transfer-available') {
			if (event.origin !== origin) {
				console.error(
					`Received transfer message from unexpected origin: ${event.origin}`,
				);
				return;
			}
			console.log('Transfer available');
			const message = {
				type: 'transfer-accepted',
			};
			frame.contentWindow?.postMessage(message, origin);
		} else if (event.data.type === 'transfer') {
			console.info('Received transfer file');
			const file = event.data.file;
			await importClientBackup(client, file);
			frame.remove();
			console.info('Transfer complete');
			onComplete?.();
		}
	});

	document.body.appendChild(frame);
}

export async function transferOrigins(
	client: BackupClient,
	from: string,
	to: string,
	handlers: {
		onStart?: () => void;
		onComplete?: () => void;
	} = {},
) {
	const transferKey = `@@verdant-${client.namespace}-transferred`;
	if (window.localStorage.getItem(transferKey) === 'true') {
		return;
	}

	function handleComplete() {
		// remove query param
		const url = new URL(window.location.href);
		url.searchParams.delete('transfer');
		window.history.replaceState({}, '', url.toString());
		window.localStorage.setItem(transferKey, 'true');
		handlers.onComplete?.();
	}

	if (
		window.location.origin === to &&
		new URLSearchParams(window.location.search).get('transfer')
	) {
		handlers.onStart?.();
		acceptTransferFrom(client, from, handleComplete);
	} else if (window.location.origin === from) {
		advertiseTransferTo(client, to);
	}
}
