import Typeson from 'typeson';
import {encode, decode} from 'base64-arraybuffer-es6';

const dataview = {
    dataview: {
        test (x) { return Typeson.toStringTag(x) === 'DataView'; },
        replace ({buffer, byteOffset, byteLength}, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            const index = stateObj.buffers.indexOf(buffer);
            if (index > -1) {
                return {index, byteOffset, byteLength};
            }
            stateObj.buffers.push(buffer);
            return {
                encoded: encode(buffer),
                byteOffset,
                byteLength
            };
        },
        revive (b64Obj, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            const {byteOffset, byteLength, encoded, index} = b64Obj;
            let buffer;
            if ('index' in b64Obj) {
                buffer = stateObj.buffers[index];
            } else {
                buffer = decode(encoded);
                stateObj.buffers.push(buffer);
            }
            return new DataView(buffer, byteOffset, byteLength);
        }
    }
};

export default dataview;
