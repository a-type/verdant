import Typeson from 'typeson';
import {encode, decode} from 'base64-arraybuffer-es6';

const arraybuffer = {
    arraybuffer: {
        test (x) { return Typeson.toStringTag(x) === 'ArrayBuffer'; },
        replace (b, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            const index = stateObj.buffers.indexOf(b);
            if (index > -1) {
                return {index};
            }
            stateObj.buffers.push(b);
            return encode(b);
        },
        revive (b64, stateObj) {
            if (!stateObj.buffers) {
                stateObj.buffers = [];
            }
            if (typeof b64 === 'object') {
                return stateObj.buffers[b64.index];
            }
            const buffer = decode(b64);
            stateObj.buffers.push(buffer);
            return buffer;
        }
    }
};

export default arraybuffer;

// See also typed-arrays!
