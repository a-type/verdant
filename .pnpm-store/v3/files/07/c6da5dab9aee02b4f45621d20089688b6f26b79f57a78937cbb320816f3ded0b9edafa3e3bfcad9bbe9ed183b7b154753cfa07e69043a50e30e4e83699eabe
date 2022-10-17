# typeson-registry

The type registry for [typeson](https://github.com/dfahlander/typeson).

- Types listed under
    [types](https://github.com/dfahlander/typeson-registry/tree/master/types)
- Presets listed under
    [presets](https://github.com/dfahlander/typeson-registry/tree/master/presets)

See below for notes on these types and presets.

Note that some types will require polyfills in Node such as via
[`jsdom`](https://github.com/jsdom/jsdom).
See the testing environment of `test/test.js` for some examples.

## Installation

Note that for Node.js, to use the `file` or `blob` types (or the `filelist`
type or `structuredCloning` and `structuredCloningThrowing` presets which
include them), you will need a polyfill for `Blob` or `File`, respectively,
as well as `FileReader` and `URL.createObjectURL` (and a
polyfill for `URL` if you are using Node < 10.0.0 or an older browser).
Note that our `URL.createObjectURL` polyfill expects a global
`XMLHttpRequest` and `location.href` predefined before it as well (and one
which can handle `data:` URLs). For Node, you can add it like this:

```js
const url = require('url'); // This line only needed to support Node < 10.0.0
const {createObjectURL} = require('typeson-registry/polyfills/createObjectURL-cjs');

const URL = url.Url; // This line only needed to support Node < 10.0.0
URL.createObjectURL = createObjectURL;
```

We have not added `jsdom` as a dependency, but it is required if this
polyfill is used.

Besides the polyfills for `file` or `blob`, the `structuredCloningThrowing`
preset also needs a global `DOMException` polyfill.

The `filelist` type, in addition to the polyfills for `file`, will need
a `FileList` polyfill (including a `FileList` string tag).

The `imagebitmap` type requires a global `createImageBitmap` polyfill (and
an `ImageBitmap` polyfill (including an `ImageBitmap` string tag).

The `imagedata` type requires a global `ImageData` polyfill (including an
`ImageData` string tag).

You may wish to see our `test-node.js` and `test-environment.js` files
for how some polyfilling may be done (largely using `jsdom`).

The `cloneable` and `resurrectable` types (and the `createObjectURL`
polyill) each accept an optional global `performance` polyfill (through
the common file `utils/generateUUID.js`).

### Building files from Git clone (as opposed to npm installs)

If you have cloned the repo (and not the npm package), you must run
`npm install` to get the `devDependencies` and then run
`npm run rollup` to get the individual browser scripts built locally
(into `dist`) or to get `index.js` to be rebuilt based on existing
presets and types).

## Usage (Pre-rollup in Node or browser)

```js
import Typeson from 'typeson';
import date from 'typeson-registry/types/date';
import error from 'typeson-registry/types/error';
import regexp from 'typeson-registry/types/regexp';
import typedArrays from 'typeson-registry/types/typed-arrays';

const TSON = new Typeson().register([
    date,
    error,
    regexp,
    typedArrays
    // ...
]);

const tson = TSON.stringify({
    Hello: 'world',
    date: new Date(),
    error: new Error('test'),
    inner: {
        x: /foo/gui,
        bin: new Uint8Array(64)
    }
}, null, 2);

console.log(tson);
/* Output:

{
  "Hello": "world",
  "date": 1464049031538,
  "error": {
    "name": "Error",
    "message": "test"
  },
  "inner": {
    "x": {
      "source": "foo",
      "flags": "gi"
    },
    "bin": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
  },
  "$types": {
    "date": "Date",
    "error": "Error",
    "inner.x": "RegExp",
    "inner.bin": "Uint8Array"
  }
}
*/

const parsedBack = TSON.parse(tson);

console.log(parsedBack.date instanceof Date);
console.log(parsedBack.inner.bin instanceof Uint8Array);
```

## Usage (Node without own Rollup)

```js
const Typeson = require('typeson-registry/dist/all.js');

const {presets: {builtin}} = Typeson;
const tson = new Typeson().register([
    builtin
]);
```

## Usage (`import` in supporting browsers without own Rollup)

```html
<script type="module">

import Typeson from './node_modules/typeson-registry/dist/index.js';

const {presets: {builtin}} = Typeson;
const TSON = new Typeson().register([
    builtin
]);
</script>
```

## Usage (with plain script tags without own Rollup)

All types and presets under `dist/` are UMD modules so you could also
require them as AMD modules with requirejs if you prefer.

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://unpkg.com/typeson/dist/typeson.js"></script>
    <script src="https://unpkg.com/typeson-registry/dist/presets/builtin.js"></script>
    <script>

    const TSON = new Typeson().register(Typeson.presets.builtin);
    const tson = TSON.stringify({
        Hello: 'world',
        date: new Date(),
        error: new Error('err'),
        inner: {
            x: /foo/giu,
            bin: new Uint8Array(64)
        }
    }, null, 2);

    alert(tson);
    /* Alerts:

    {
      "Hello": "world",
      "date": 1464049031538,
      "error": {
        "name": "Error",
        "message": "err"
      },
      "inner": {
        "x": {
          "source": "foo",
          "flags": "gi"
        },
        "bin": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
      },
      "$types": {
        "date": "Date",
        "error": "Error",
        "inner.x": "RegExp",
        "inner.bin": "Uint8Array"
      }
    }
    */

    </script>
  </head>
</html>
```

## Notes on types and presets

Note that the type name corresponds to the file name in the following manner:

1. Genuine separate words are camel-cased in the type name but hyphenated in
    the file name (e.g., `negativeInfinity` and `negativity-infinity.js`);
    names whose original API is camel-cased are not hyphenated, however
    (e.g., `arraybuffer` and `arraybuffer.js` given `ArrayBuffer`).
1. All other portions of names are lower-cased (e.g., `date` and `date.js`).
1. Type names that would clash with existing objects when exported (even after
    lower-casing) must have a separate, preferably abbreviated form (e.g.,
    the type and preset `undef` and `undef.js` was necessary for `undefined`)
1. Type names which are not allowed as ES6 exports (e.g., periods in `Intl`
    types are now removed: `Intl.Collator` -> `IntlCollator`)
1. Type names should indicate the singular (e.g., `userObject`) except for
    files containing multiple related exports (e.g., `errors`, `typed-arrays`,
    and `typed-arrays-socketio.js`); files with multiple exports whose extra
    exports are incidental (e.g., `filelist`) do not need a plural.

### Types

- `arraybuffer`
- `bigintObject`
- `bigint`
- `blob` - Has sync and async encapsulation/replacements (though sync only
    via deprecated means)
- `cloneable` - Looks for `Symbol.for('cloneEncapsulate')` and
    `Symbol.for('cloneRevive')` methods to allow
    for a means of extending our built-in structured cloning presets (though if
    you are polyfilling a standard object, we welcome you to submit back as a
    PR!). The clones cannot be revived past the current window session,
    however.
- `dataview`
- `date`
- `error.js` (`Error`) and `errors.js` (`TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`, `EvalError`, `URIError`, `InternalError`) - These
    provide a means of resurrecting error object across cloning boundaries
    (since they are not otherwise treated as cloneable by the Structured
    Cloning Algorithm).
- `file` - Has sync and async encapsulation/replacements (though sync only
    via deprecated means)
- `filelist` - HTML does not provide a means of creating a `FileList` object
    dynamically, so we polyfill one for revival. This method also sets `File`
- `imagebitmap` - Has sync and async revivers. The sync method does not produce
    a genuine `ImageBitmap` but instead produces a canvas element which can
    frequently be used in a similar context to `ImageBitmap`.
- `imagedata`
- `infinity` - Preserves positive infinity
- `intl-types.js` (`Intl.Collator`, `Intl.DateTimeFormat`, `Intl.NumberFormat`) -
    Not all properties can be preserved
- `map`
- `nan` - Preserves `NaN` (not a number)
- `NegativeInfinity` - Preserves negative infinity
- `nonBuiltInIgnore` - For roughly detecting non-builtin objects and to avoid
    adding them as properties
- `primitive-objects.js` (`StringObject`, `BooleanObject`, `NumberObject`)
- `regexp`
- `resurrectable` - Resurrects any non-array object, function, or symbol; can
    only be revived for the current window session.
- `set`
- `typed-arrays-socketio.js` (`Int8Array`, `Uint8Array`, `Uint8ClampedArray`,
    `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`,
    `Float64Array`) - See
    [typeson#environmentformat-support](https://github.com/dfahlander/typeson#environmentformat-support)
    and `presets/socketio.js`
- `typed-arrays.js` (`Int8Array`, `Uint8Array`, `Uint8ClampedArray`,
    `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`,
    `Float32Array`, `Float64Array`) - Base64-encodes
- `undef` (for `undefined`) (See also `presets/undefined.js` and
    `presets/sparse-undefined.js`)
- `userObjects` - Allows for inherited objects but ensures the prototype chain
    inherits from `Object` (or `null`). Should be low priority if one is
    matching other objects as it will readily match many objects.

### Presets

- `array-nonindex-keys.js`
- `builtin.js` - Types that are built into the JavaScript language itself.
    Types that were added in ES6 or beyond will be checked before inclusion
    so that this module can be consumed by both ES5 and ES6 environments.
    Some imperfectly serializable objects (such as functions and Symbols)
    are not included in this preset.
- `postmessage.js` - This preset is intended as a utility to expand on what is
    cloneable via `strcutured-cloning.js` and supports Error objects.
- `socketio.js`
- `sparse-undefined.js` (`sparseArrays` and `sparseUndefined`) - Supports
    reconstructing sparse arrays (with missing properties not even assigned
    an explicit `undefined`). See `types/undefined.js` for the explicit case
    or `presets/undefined.js` for a utility combining both.
- `special-numbers.js` (preserves `NaN`, `Infinity`, `-Infinity`)
- `structured-cloning.js` - For the Structured Cloning Algorithm used by the
    likes of `postMessage` and `indexedDB`. See also the `cloneable` type.
- `structured-cloning-throwing.js` - Same as `structured-cloning.js` but
    throws with non-recognized types. See also the `cloneable` type.
- `undef.js` - Supports reconstructing explicit and implicit (sparse)
    uses of `undefined`.
- `universal.js`- Meant for de-facto universal types. Currently includes
    built-ins only.

### Functions (support not included)

If you are looking for a way to resurrect functions, you can use the following,
but please bear in mind that it uses `eval` which is prohibited by some
Content Security Policies (CSP) (so we are not packaging it with our builds),
that it is unsafe, and also that the function might not behave
deterministically when revived (e.g., if the function were provided from
another context).

```js
const functionType = {functionType: [
    function (x) { return typeof x === 'function'; },
    function (funcType) { return '(' + funcType.toString() + ')'; },
    // eslint-disable-next-line no-eval
    function (o) { return eval(o); }
]};

const typeson = new Typeson().register(functionType);
const tson = typeson.stringify(function () { return 'abc'; });
const back = typeson.parse(tson);
back(); // 'abc'
```

## Development

[node-canvas](https://github.com/Automattic/node-canvas) is used to test
`ImageData`.

Be sure to follow the installation steps.

On Windows, besides following the
[Windows installation steps](https://github.com/Automattic/node-canvas/wiki/Installation---Windows),
[this](https://github.com/nodejs/node-gyp/issues/94#issuecomment-278587021)
helped complete the installation. If you need to have it rebuilt, you can
run `npm i` inside of the `node_modules/canvas` directory.

[These steps](https://github.com/Automattic/node-canvas/issues/191#issuecomment-7681555)
were also necessary but you can run `npm run windows` after install to get
these steps applied. These are the only steps which should need to be re-run
if you have deleted your local `node-canvas` copy.

## See also

- [typeson](https://github.com/dfahlander/typeson)
