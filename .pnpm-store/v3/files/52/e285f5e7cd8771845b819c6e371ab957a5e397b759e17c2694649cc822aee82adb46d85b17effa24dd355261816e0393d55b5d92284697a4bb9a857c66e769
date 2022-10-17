// Here we allow the exact same non-plain object, function, and symbol
//  instances to be resurrected (assuming the same session/environment);
//  plain objects are ignored by Typeson so not presently available and
//  we consciously exclude arrays

import generateUUID from '../utils/generateUUID.js';

const resurrectableObjectsByUUID = {};

const resurrectable = {
    resurrectable: {
        test (x) {
            return x &&
                !Array.isArray(x) &&
                ['object', 'function', 'symbol'].includes(typeof x);
        },
        replace (rsrrctble) {
            const uuid = generateUUID();
            resurrectableObjectsByUUID[uuid] = rsrrctble;
            return uuid;
        },
        revive (serializedResurrectable) {
            return resurrectableObjectsByUUID[serializedResurrectable];
        }
    }
};

export default resurrectable;
