/* globals BigInt */
import Typeson from 'typeson';

const bigintObject = {
    bigintObject: {
        test (x) {
            return typeof x === 'object' && Typeson.hasConstructorOf(x, BigInt);
        },
        replace (n) { return String(n); },
        revive (s) {
            // Filed this to avoid error: https://github.com/eslint/eslint/issues/11810
            // eslint-disable-next-line no-new-object
            return new Object(BigInt(s));
        }
    }
};

export default bigintObject;
