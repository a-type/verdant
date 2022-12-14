import 'fake-indexeddb/auto/index.mjs';
import { WebSocket } from 'ws';
global.WebSocket = WebSocket;
