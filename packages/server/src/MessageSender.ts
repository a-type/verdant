import { ServerMessage } from '@lo-fi/common';

export interface MessageSender {
	broadcast(
		libraryId: string,
		message: ServerMessage,
		omitKeys?: string[],
	): void;
	respond(libraryId: string, clientKey: string, message: ServerMessage): void;
	sendToUser(libraryId: string, userId: string, message: ServerMessage): void;
}
