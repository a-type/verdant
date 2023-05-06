import { ServerMessage } from '@verdant/common';

export interface MessageSender {
	broadcast(
		libraryId: string,
		message: ServerMessage,
		omitKeys?: string[],
	): void;
	send(libraryId: string, clientKey: string, message: ServerMessage): void;
}
