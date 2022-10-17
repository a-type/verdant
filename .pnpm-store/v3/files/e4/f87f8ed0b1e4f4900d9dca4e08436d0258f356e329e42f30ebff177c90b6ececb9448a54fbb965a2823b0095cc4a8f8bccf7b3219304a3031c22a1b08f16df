import builtin from './builtin.js';
import typedArraysSocketIO from '../types/typed-arrays-socketio.js';

const socketio = [
    builtin,
    // Leave ArrayBuffer as is, and let socket.io stream it instead.
    {arraybuffer: null},
    // Encapsulate TypedArrays in ArrayBuffers instead of base64 strings.
    typedArraysSocketIO
];

export default socketio;
