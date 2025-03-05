import { ServerMessage } from '@verdant-web/common';

export interface MessageSender {
	broadcast(message: ServerMessage, omitKeys?: string[]): void;
	respond(clientKey: string, message: ServerMessage): void;
}
