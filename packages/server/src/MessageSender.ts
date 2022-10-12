import { ServerMessage } from '@lo-fi/common';

export interface MessageSender {
	broadcast(
		libraryId: string,
		message: ServerMessage,
		omitReplicas?: string[],
	): void;
	send(libraryId: string, replicaId: string, message: ServerMessage): void;
}
