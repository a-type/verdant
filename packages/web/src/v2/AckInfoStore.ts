import { IDBService } from './IDBService.js';

type AckInfo = {
	type: 'ack';
	// null means no operations are acknowledged
	// by every peer yet.
	globalAckTimestamp: string | null;
};

export class AckInfoStore extends IDBService {
	getAckInfo = async (): Promise<AckInfo> => {
		const result = await this.run<AckInfo>('info', (store) => store.get('ack'));
		if (result) {
			return result;
		} else {
			return {
				globalAckTimestamp: null,
				type: 'ack',
			};
		}
	};

	setGlobalAck = async (ack: string) => {
		await this.run(
			'info',
			(store) => store.put({ type: 'ack', globalAckTimestamp: ack }),
			'readwrite',
		);
	};
}
