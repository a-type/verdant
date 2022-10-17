/* eslint-env browser, node */
import Typeson from 'typeson';

/* istanbul ignore next */
const _global = typeof self === 'undefined' ? global : self;

// Support all kinds of typed arrays (views of ArrayBuffers)
const typedArraysSocketIO = {};
[
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array'
].forEach(function (typeName) {
    const arrType = typeName;
    const TypedArray = _global[typeName];
    /* istanbul ignore if */
    if (!TypedArray) {
        return;
    }
    typedArraysSocketIO[typeName.toLowerCase()] = {
        test (x) { return Typeson.toStringTag(x) === arrType; },
        replace (a) {
            return (a.byteOffset === 0 &&
                a.byteLength === a.buffer.byteLength
                ? a
                // socket.io supports streaming ArrayBuffers.
                // If we have a typed array representing a portion
                //   of the buffer, we need to clone
                //   the buffer before leaving it to socket.io.
                : a.slice(0)).buffer;
        },
        revive (buf) {
            // One may configure socket.io to revive binary data as
            //    Buffer or Blob.
            // We should therefore not rely on that the instance we
            //   get here is an ArrayBuffer
            // If not, let's assume user wants to receive it as
            //   configured with socket.io.
            return Typeson.toStringTag(buf) === 'ArrayBuffer'
                ? new TypedArray(buf)
                : buf;
        }
    };
});

export default typedArraysSocketIO;
