import 'fake-indexeddb/auto/index.mjs';
import { WebSocket } from 'ws';

// @ts-ignore
global.WebSocket = WebSocket;

// patch URL.createObjectURL to return a string
// @ts-ignore
URL.createObjectURL = (blob: Blob) => {
	return `blob:${blob.type}:${blob.size}`;
};
