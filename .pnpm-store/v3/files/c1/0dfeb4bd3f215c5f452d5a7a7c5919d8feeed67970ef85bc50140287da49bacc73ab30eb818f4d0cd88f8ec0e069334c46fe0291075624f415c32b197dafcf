/* eslint-env browser, node */
import Typeson from 'typeson';
import {encode, decode} from 'base64-arraybuffer-es6';

/* istanbul ignore next */
const _global = typeof self === 'undefined' ? global : self;

const typedArrays = {};
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
    const TypedArray = _global[arrType];
    /* istanbul ignore if */
    if (!TypedArray) {
        return;
    }
    typedArrays[typeName.toLowerCase()] = {
        test (x) { return Typeson.toStringTag(x) === arrType; },
        replace ({buffer, byteOffset, length: l}, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            const index = stateObj.buffers.indexOf(buffer);
            if (index > -1) {
                return {index, byteOffset, length: l};
            }
            stateObj.buffers.push(buffer);
            return {
                encoded: encode(buffer),
                byteOffset,
                length: l
            };
        },
        revive (b64Obj, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            const {byteOffset, length: len, encoded, index} = b64Obj;
            let buffer;
            if ('index' in b64Obj) {
                buffer = stateObj.buffers[index];
            } else {
                buffer = decode(encoded);
                stateObj.buffers.push(buffer);
            }
            return new TypedArray(buffer, byteOffset, len);
        }
    };
});

export default typedArrays;
