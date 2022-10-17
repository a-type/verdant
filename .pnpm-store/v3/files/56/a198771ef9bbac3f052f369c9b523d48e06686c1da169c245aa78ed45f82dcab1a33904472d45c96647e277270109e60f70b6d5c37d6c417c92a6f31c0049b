// This module is for objectified primitives (such as `new Number(3)` or
//      `new String("foo")`)
/* eslint-disable no-new-wrappers, unicorn/new-for-builtins */
import Typeson from 'typeson';

const primitiveObjects = {
    // String Object (not primitive string which need no type spec)
    StringObject: {
        test (x) {
            return Typeson.toStringTag(x) === 'String' && typeof x === 'object';
        },
        replace (s) { return String(s); }, // convert to primitive string
        revive (s) { return new String(s); } // Revive to an objectified string
    },
    // Boolean Object (not primitive boolean which need no type spec)
    BooleanObject: {
        test (x) {
            return Typeson.toStringTag(x) === 'Boolean' &&
                typeof x === 'object';
        },
        replace (b) { return Boolean(b); }, // convert to primitive boolean
        revive (b) {
            // Revive to an objectified Boolean
            return new Boolean(b);
        }
    },
    // Number Object (not primitive number which need no type spec)
    NumberObject: {
        test (x) {
            return Typeson.toStringTag(x) === 'Number' && typeof x === 'object';
        },
        replace (n) { return Number(n); }, // convert to primitive number
        revive (n) { return new Number(n); } // Revive to an objectified number
    }
};
/* eslint-enable no-new-wrappers, unicorn/new-for-builtins */

export default primitiveObjects;
