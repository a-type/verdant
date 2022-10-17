const arrayNonindexKeys = [
    {
        arrayNonindexKeys: {
            testPlainObjects: true,
            test (x, stateObj) {
                if (Array.isArray(x)) {
                    if (
                        // By avoiding serializing arrays into objects which
                        //  have only positive-integer keys, we reduce
                        //  size and improve revival performance; arrays with
                        //  non-index keys will be larger however
                        Object.keys(x).some((k) => {
                            //  No need to check for `isNaN` or
                            //   `isNaN(Number.parseInt())` as `NaN` will be
                            //   treated as a string.
                            //  No need to do check as
                            //   `Number.parseInt(Number())` since scientific
                            //   notation will be pre-resolved if a number
                            //   was given, and it will otherwise be a string
                            return String(Number.parseInt(k)) !== k;
                        })
                    ) {
                        stateObj.iterateIn = 'object';
                        stateObj.addLength = true;
                    }
                    return true;
                }
                return false;
            },
            replace (a, stateObj) {
                // Catch sparse undefined
                stateObj.iterateUnsetNumeric = true;
                return a;
            },
            revive (o) {
                if (Array.isArray(o)) {
                    return o;
                }
                const arr = [];
                // No map here as may be a sparse array (including
                //   with `length` set)
                // Todo: Reenable when Node `engines` >= 7
                // Object.entries(o).forEach(([key, val]) => {
                Object.keys(o).forEach((key) => {
                    const val = o[key];
                    arr[key] = val;
                });
                return arr;
            }
        }
    },
    {
        sparseUndefined: {
            test (x, stateObj) {
                return typeof x === 'undefined' && stateObj.ownKeys === false;
            },
            replace (n) { return 0; },
            revive (s) { return undefined; } // Will avoid adding anything
        }
    }
];

export default arrayNonindexKeys;
