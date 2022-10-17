import Typeson from 'typeson';

const nonbuiltinIgnore = {
    nonbuiltinIgnore: {
        test (x) {
            return x && typeof x === 'object' && !Array.isArray(x) && ![
                'Object',
                // `Proxy` and `Reflect`, two other built-in objects, will also
                //   have a `toStringTag` of `Object`; we don't want built-in
                //   function objects, however
                'Boolean', 'Number', 'String',
                'Error', 'RegExp', 'Math', 'Date',
                'Map', 'Set',
                'JSON',
                'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
                'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array',
                'Uint16Array', 'Int32Array', 'Uint32Array',
                'Float32Array', 'Float64Array',
                'Promise',
                'String Iterator', 'Array Iterator',
                'Map Iterator', 'Set Iterator',
                'WeakMap', 'WeakSet',
                'Atomics', 'Module'
            ].includes(Typeson.toStringTag(x));
        },
        replace (rexp) {
            // Not in use
        }
    }
};

export default nonbuiltinIgnore;
