// This does not preserve `undefined` in sparse arrays; see the `undefined`
//  or `sparse-undefined` preset
import Typeson from 'typeson';

const undef = {
    undef: {
        test (x, stateObj) {
            return typeof x === 'undefined' &&
                (stateObj.ownKeys || !('ownKeys' in stateObj));
        },
        replace (n) { return 0; },
        revive (s) {
            // Will add `undefined` (returning `undefined` would instead
            //   avoid explicitly setting)
            return new Typeson.Undefined();
        }
    }
};

export default undef;
