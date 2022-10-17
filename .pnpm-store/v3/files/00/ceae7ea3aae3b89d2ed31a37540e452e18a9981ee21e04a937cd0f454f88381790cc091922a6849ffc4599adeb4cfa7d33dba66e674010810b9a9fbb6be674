# typeson.js

Preserves types over JSON, BSON or socket.io.

*typeson.js is tiny. 2.6 kb minified. ~1 kb gzipped.*

## Example of how a stringified object can look

```js
const objs = [
  {foo: 'bar'},
  // {"foo":"bar"} (simple types gives plain JSON)
  {foo: new Date()},
  // {"foo":1464049031538, "$types":{"foo":"Date"}}
  {foo: new Set([new Date()])},
  // {"foo":[1464127925971], "$types":{"foo":"Set","foo.0":"Date"}}
  {foo: {sub: /bar/iu}},
  // {"foo":{"sub":{"source":"bar","flags":"i"}}, "$types":{"foo.sub":"RegExp"}}
  {foo: new Int8Array(3)},
  // {"foo":"AAAA", "$types":{"foo":"Int8Array"}}
  new Date()
  // {"$":1464128478593, "$types":{"$":{"":"Date"}}} (special format at root)
];
```

## Why?

JSON can only contain strings, numbers, booleans, `null`, arrays and objects. If you want to serialize other types over HTTP, WebSocket, `postMessage()` or other channels, this module makes it possible to serialize any type over channels that normally only accept vanilla objects. Typeson adds a metadata property `$types` to the result that maps each non-trivial property to a type name. (In the case of arrays or encoded primitives, a new object will instead be created with a `$` property that can be preserved by JSON.) The type name is a reference to a registered type specification that you need to have the same on both the stringifying and the parsing side.

## Type Registry

[typeson-registry](https://github.com/dfahlander/typeson-registry) contains encapsulation rules for standard JavaScript types such as `Date`, `Error`, `ArrayBuffer`, etc. Pick the types you need, use a preset or write your own.

```js
const typeson = new Typeson().register([
    require('typeson-registry/types/date'),
    require('typeson-registry/types/set'),
    require('typeson-registry/types/regexp'),
    require('typeson-registry/types/typed-arrays')
]);
```
or if you want support for all built-in JavaScript classes:
```js
const typeson = new Typeson().register([
    require('typeson-registry/presets/builtin')
]);
```
The module `typeson-registry/presets/builtin` is 1.6 kb minified and gzipped and adds support 32 builtin JavaScript types: *Date, RegExp, NaN, Infinity, -Infinity, Set, Map, ArrayBuffer, DataView, Uint8Array, Int8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Error, SyntaxError, TypeError, RangeError, ReferenceError, EvalError, URIError, InternalError, Intl.Collator, Intl.DateTimeFormat, Intl.NumberFormat, Object String, Object Number and Object Boolean*.

## Compatibility

- Node
- Browser
- Worker
- ES5

## Features

- Can stringify custom and standard ES5 / ES6 classes.
- Produces standard JSON with an additional `$types` property in case it is needed (or a new object if representing a primitive or array at root).
- Resolves cyclic references, such as lists of objects where each object has a reference to the list
- You can register (almost) any type to be stringifiable (serializable) with your typeson instance.
- Output will be identical to that of `JSON.stringify()` in case your object doesnt contain special types or cyclic references.
- Type specs may encapsulate its type in other registered types. For example, `ImageData` is encapsulated as `{array: Uint8ClampedArray, width: number, height: number}`, expecting another spec to convert the `Uint8ClampedArray`. With the [builtin](https://github.com/dfahlander/typeson-registry/blob/master/presets/builtin.js) preset this means it's gonna be converted to base64, but with the [socketio](https://github.com/dfahlander/typeson-registry/blob/master/presets/socketio.js) preset, its gonna be converted to an `ArrayBuffer` that is left as-is and streamed binary over the WebSocket channel!

## Limitations

Since typeson has a synchronous API, it cannot encapsulate and revive async types such as `Blob`, `File` or `Observable`. Encapsulating an async object requires to be able to emit streamed content asynchronically. Remoting libraries could however complement typeson with a streaming channel that handles the emitting of stream content. For example, a remoting library could define a typeson rule that encapsulates an [Observable](https://github.com/zenparsing/es-observable) to an id (string or number for example), then starts subscribing to it and emitting the chunks to the peer as they arrive. The peer could revive the id to an observable that when subscribed to, will listen to the channel for chunks destinated to the encapsulated ID.

## Usage

```
npm install typeson
```

```js
// Require typeson. It's an UMD module so you could also use requirejs
//  or plain script tags.
const Typeson = require('typeson');

const typeson = new Typeson().register({
    Date: [
        (x) => x instanceof Date, // test function
        (d) => d.getTime(), // encapsulator function
        (number) => new Date(number) // reviver function
    ],
    Error: [
        (x) => x instanceof Error, // tester
        (e) => ({name: e.name, message: e.message}), // encapsulator
        (data) => {
          // reviver
          const e = new Error(data.message);
          e.name = data.name;
          return e;
        }
    ],
    SimpleClass // Default rules apply. See "register (typeSpec)"
});

function SimpleClass (foo) {
    this.foo = foo;
}

// Encapsulate to a JSON friendly format:
const jsonFriendly = typeson.encapsulate({
    date: new Date(),
    e: new Error('Oops'),
    c: new SimpleClass('bar')
});
// Stringify using good old JSON.stringify()
const json = JSON.stringify(jsonFriendly, null, 2);
/*
{
  "date": 1464049031538,
  "e": {
    "name": "Error",
    "message": "Oops"
  },
  "c": {
    "foo": "bar"
  },
  "$types": {
    "date": "Date",
    "e": "Error",
    "c": "SimpleClass"
  }
}
*/

// Parse using good old JSON.parse()
const parsed = JSON.parse(json);
// Revive back again:
const revived = typeson.revive(parsed);

```
*The above sample separates Typeson.encapsulate() from JSON.stringify(). Could also have used Typeson.stringify().*

## Environment/Format support

### Use with socket.io

Socket.io can stream `ArrayBuffer`s as real binary data. This is more efficient than encapsulating it in base64/JSON. Typeson can leave certain types, like `ArrayBuffer`, untouched, and leave the stringification / binarization part to other libs (use `Typeson.encapsulate()` and not `Typeson.stringify()`).

What socket.io doesn't do though, is preserve `Date`s, `Error`s or your custom types.

So to get the best of two worlds:

- Register preset 'typeson-registry/presets/socketio' as well as your custom types.
- Use `Typeson.encapsulate()` to generate an object ready for socket-io `emit()`
- Use `Typeson.revive()` to revive the encapsulated object at the other end.

```js
const Typeson = require('typeson'),
    presetSocketIo = require('typeson-registry/presets/socketio.js');

const TSON = new Typeson()
    .register(presetSocketIo)
    .register({
        CustomClass: [
            (x) => x instanceof CustomClass,
            (c) => ({foo: c.foo, bar: c.bar}),
            (o) => new CustomClass(o.foo, o.bar)
        ]
    });

const array = new Float64Array(65536);
array.fill(42, 0, 65536);

const data = {
    date: new Date(),
    error: new SyntaxError('Ooops!'),
    array,
    custom: new CustomClass('foo', 'bar')
};

socket.emit('myEvent', TSON.encapsulate(data));
```

The `encapsulate()` method will not stringify but just traverse the object and return a simpler structure where certain properties are replaced with a substitute. The resulting object will also have a `$types` property containing the type metadata.

Packing it up at the other end:

```js
socket.on('myEvent', function (data) {
    const revived = TSON.revive(data);
    // Here we have a true `Date`, `SyntaxError`, `Float64Array`
    //  and `Custom` to play with.
});
```
*NOTE: Both peers must have the same types registered.*

### Use with [BSON](https://www.npmjs.com/package/bson)

The BSON format can serialize object over a binary channel. It supports just the standard JSON types plus `Date`, `Error` and optionally `Function`. You can use Typeson to encapsulate and revive other types as well with BSON as bearer. Use it the same way as shown above with socket.io.

### Use with Worker.postMessage()

Web Workers have the `onmessage` and `postMessage()` communication channel that has built-in support for transferring structures using the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm). It supports `Date`, `ArrayBuffer`and many other standard types, but not `Error`s or your own custom classes. To support `Error` and custom types over web worker channels, register just the types that are needed (`Error`s and your custom types), and then use `Typeson.encapsulate()` before posting a message, and `Typeson.revive()` in the `onmessage` callback.

## API

### constructor ([options])

```js
const typeson = new Typeson([options]);
```

Creates an instance of Typeson, on which you may configure additional types to support, or call `encapsulate()`, `revive()`, `stringify()` or `parse()` on.

#### Arguments

##### options (optional):

```
{
    cyclic?: boolean, // Default true to allow cyclic objects
    encapsulateObserver?: function, // Default no-op
    sync?: true, // Don't force a promise response regardless of type
    throwOnBadSyncType?: true // Default to throw when mismatch with `Typeson.Promise` obtained for sync request or not returned for async
}
```

###### `cyclic`: boolean

Whether or not to support cyclic references. Defaults to `true` unless explicitly set to `false`. If this property is `false`, the parsing algorithm becomes a little faster and in case a single object occurs on multiple properties, it will be duplicated in the output (as `JSON.stringify()` would do). If this property is `true`, several instances of same object will only occur once in the generated JSON and other references will just contain a pointer to the single reference.

###### `encapsulateObserver`: object (see description)

For encapsulations/stringifications, this callback will be executed as objects are iterated and types are detected. An observer might be used to build an interface based on the original object taking advantage of serialized values (the `replaced` property) passed to the observer along the way, even potentially without concern to the actual encapsulated result.

`encapsulateObserver` is passed an object with the following properties:

- `type` - If a type was detected, whether at either the `awaitingTypesonPromise` or
    `resolvingTypesonPromise` stage, this property will indicate the detected type. If
    this is a regular JSON type, its name ('null', 'boolean', 'number', 'string', 'array',
    or 'object') will be reported
- `keypath` - The keypath at which the observer is reporting.
- `value` - The original value found at this stage by the observer. (`replaced`, on the other hand, can be consulted to obtain any type replacement value.)
- `cyclic` - A boolean indicating whether the current state is expecting cyclics. Will be `"readonly"` if this iteration is due to a recursive replacement.
- `stateObj` - The state object at the time of observation.
- `promisesData` - The promises array.
- `resolvingTypesonPromise` - A boolean indicating whether or not this observation is occurring at the (Typeson) promise stage.
- `awaitingTypesonPromise` - Will be `true` if still awaiting the full resolution; this could be ignored or used to set a placeholder.

The following properties are also present in particular cases:
- `typeDetected` - Set to `true` when a Typeson-detected type is found but no relevant replacer is present to be performed.
- `replacing` - Set to `true` preceding a Typeson-detected type replacement. Use this to get at the original object value before encapsulation
- `clone` - If a plain object or array is found or if `iterateIn` is set, this property holds the clone of that object or array.
- `replaced` - This property will be set when a type was detected. This value is useful for obtaining the serialization of types.
- `cyclicKeypath` - Will be present if a cyclic object (including array) were detected; refers to the key path of the prior detected object.
- `endIterateIn` - Will be `true` if finishing iteration of `in` properties.
- `endIterateOwn` - Will be `true` if finishing iteration of "own" properties.
- `endIterateUnsetNumeric` - Will be `true` if finishing iteration of unset numeric properties.
- `end` - Convenience property that will be `true` if `endIterateIn`, `endIterateOwn`, or `endIterateUnsetNumeric` is `true`.

###### `sync`: boolean (Internal property)

Types can utilize `Typeson.Promise` to allow asynchronous encapsulation and stringification.

When such a type returns a `Typeson.Promise`, a regular `Promise` will be returned to the user.

(This property is used internally for ensuring a regular `Promise` was not intended as the result.
Note that its resolved value is also recursively checked for types.)

To ensure that a regular `Promise` is always returned and thereby to allow the same API to be
used regardless of the types in effect, the `sync` option is set to `false` by the
`*Async` methods.

Note that this has no bearing on `revive`/`parse` since they can construct any object they
wish for a return value, including a `Promise`, a stream, etc.

###### `throwOnBadSyncType`: boolean

The default is to throw when an async result is received from a synchronous method or vice versa.
This assures you that you are receiving the intended result type.

This option can be set to `false`, however, to return the raw synchronous result or the promise, allowing you the least unambiguous results (since you can discern whether a returned `Promise` was
the actual result of a revival/parsing or just the inevitable return of using an async method).

#### Sample

```js
const Typeson = require('typeson');
const typeson = new Typeson()
    .register(require('typeson-registry/presets/builtin'));

const tson = typeson.stringify(complexObject);
console.log(tson);
const obj = typeson.parse(tson);
```

### Properties

#### `types`

A map between type identifier and type-rules. Same (object-based) structure as passed to `register()`. Use this property if you want to create a new Typeson containing all types from another Typeson.

##### Sample

```js
const commonTypeson = new Typeson().register([
    require('typeson-registry/presets/builtin')
]);

const myTypeson = new Typeson().register([
    commonTypeson.types, // Derive from commonTypeson
    myOwnSpecificTypes // Add your extra types
]);
```

### Instance methods

#### `stringify` (obj, [replacer], [space], [options])

*Initial arguments identical to those of JSON.stringify()*

Generates JSON based on the given `obj`. Applies `JSON.stringify()` on the result of any relevant `replace` encapsulators.

If the supplied `obj` has special types or cyclic references, the produced JSON will contain a `$types` property on the root upon which type info relies (a map of keypath to type where the keypath is dot-separated; see `Typeson.escapeKeyPathComponent` on escaping).

The `options` object argument can include a setting for `cyclic` which overrides the default or any behavior supplied for this option in the Typeson constructor.

May also return a `Promise` if a type's `replace` encapsulator returns `Typeson.Promise`. See the documentation under `Typeson.Promise`.

##### Stringification format

If enabled, the cyclic "type" will be represented as `#` and cyclic references will be encoded as `#` plus the path to the referenced object.

If an array or primitive is encoded at root, an object will be created with a property `$` and a `$types` property that is an object with `$` as a key and instead of a type string as value, a keypath-type object will be its value (with the empty string indicating the root path).

##### Sample

```js
const TSON = new Typeson().register(require('typeson-registry/types/date'));

TSON.stringify({date: new Date()});
```
Output:
```json
{"date": 1463667643065, "$types": {"date": "Date"}}
```

#### `stringifySync` (obj, [replacer], [space], [options])

As with `stringify` but automatically throws upon obtaining a `Typeson.Promise` return result from a `replace` encapsulator (as that is expected for asynchronous types).

#### `stringifyAsync` (obj, [replacer], [space], [options])

As with `stringify` but automatically throws upon obtaining a non-`Typeson.Promise` return result from a `replace` encapsulator (as only a `Typeson.Promise` is expected for asynchronous types).

#### `parse` (obj, [reviver])

*Arguments identical to those of JSON.parse()*

Parses Typeson-generated JSON back into the original complex structure again.

Applies `JSON.parse()` and then any relevant `revive` methods that are detected.

May also return a `Promise` if a type's reviver returns `Typeson.Promise`. See
the documentation under `Typeson.Promise`.

##### Sample

```js
const date = require('typeson-registry/types/date');

const TSON = new Typeson().register(date);
TSON.parse('{"date": 1463667643065, "$types": {"date": "Date"}}');
```

#### `parseSync` (obj, [reviver])

As with `parse` but automatically throws upon obtaining a `Typeson.Promise` return result from the reviver (as that is expected for asynchronous types).

#### `parseAsync` (obj, [reviver])

As with `parse` but automatically throws upon obtaining a non-`Typeson.Promise` return result from the reviver (as only a `Typeson.Promise` is expected for asynchronous types).

#### `encapsulate` (obj, [stateObj], [opts])

Encapsulates an object but leaves the stringification part to you. Pass your encapsulated object further to socket.io, `postMessage()`, BSON or IndexedDB.

Applies the `replace` method on `test`-matching spec objects. Will return the result regardless
of whether it is an asynchronous (indicated by a `Typeson.Promise`) or synchronous result.

The `options` object argument can include a setting for `cyclic` which overrides the default or any behavior supplied for this option in the Typeson constructor.

#### `encapsulateSync` (obj, [opts])

As with `encapsulate` but automatically throws upon obtaining a `Typeson.Promise` return result from the replacer (as that is expected for asynchronous types).

#### `encapsulateAsync` (obj, [opts])

As with `encapsulate` but automatically throws upon obtaining a non-`Typeson.Promise` return result from the replacer (as only a `Typeson-Promise` is expected for asynchronous types).

##### Sample

```js
const encapsulated = typeson.encapsulate(new Date());
const revived = typeson.revive(encapsulated);
assert(revived instanceof Date);
```

#### `revive` / `reviveSync` / `reviveAsync` (obj)

Revives an encapsulated object. See `encapsulate()`.

#### `register` (typeSpec, opts = {fallback: boolean|number})

If `opts.fallback` is set, lower priority will be given (the default is that the last registered item
has highest priority during match testing). If a number is given, it will be used as the index of the placement.

##### typeSpec

An object that maps a type-name to a specification of how to test, encapsulate and revive that type.

`{TypeName => constructor-function | [tester, encapsulator, reviver] | specObject = {test: function, replace: function, replaceAsync: function, revive: function, reviveAsync: function, testPlainObjects: boolean=false}}` or an array of such structures.

Please note that if an array is supplied, the tester (and upon matching, the encapsulator)
execute in a last-in, first out order. (Calls to `register` can set `fallback` to `true` to
lower the priority of a recent addition.)

`this` will refer to the specification object.

Subsequent calls to `register` will similarly be given higher priority so be sure to add
catch-all matchers *before* more precise ones.

If `testPlainObjects` is set to `true`, a tester will be checked against plain objects and
allow replacements without recursion.

Note that you can supply `null` as a spec to remove a regular previously
registered spec, and supply an object with only `testPlainObjects: true`
to remove a previously registered spec which can remove a previously
registered spec with a plain object replacer.

###### constructor-function

A class (constructor function) that would use default test, encapsulation and revival rules, which is:

- `test`: check if x.constructor === constructor-function.
- `replace`: copy all enumerable own props into a vanilla object
- `revive`: Uses `Object.create()` to revive the correct type and copies all properties into it.
- `testPlainObjects`: `false`: Tests non-plain objects only.

###### `test` (obj : any, stateObj : {ownKeys: boolean, iterateIn: ('array'|'object'), iterateUnsetNumeric: boolean}) : boolean

Function that tests whether an instance is of your type and returns a truthy value if it is.

If the context is iteration over non-"own" integer string properties of an array (i.e.,
an absent (`undefined`) item in a sparse array), `ownKeys` will be set to `false`.
Otherwise, when iterating an object or array, it will be set to `true`. The default
for the `stateObj` is just an empty object.

If you wish to have exceptions thrown upon encountering a certain type of
value, you may leverage the tester to do so.

You may also set values on the state object.

Normally, only the "own" keys of an object will be iterated.
Setting `iterateIn` changes the behavior to iterate all properties
"in" the object for cloning (though note that doing so will add a
performance cost). The value of `iterateIn` (as 'array' or 'object')
determines what type of object will be created. Normally, 'object'
will be more useful as non-array-index properties do not
survive stringification on an array.

One special case not covered by iterating all "own" keys or enabling "in"
iteration is where one may wish to iterate the keys not "in" the object
but still part of it, i.e., the unset numeric indexes of a sparse array
(e.g., for the sake of ensuring they are ignored entirely rather than
converted to `null` by a `stringify` call). Thus encapsulators have the
ability to set `iterateUnsetNumeric: true` on their state object, but
note that doing so will add a performance cost.

###### `replace` (obj: YourType, stateObj : {ownKeys: boolean, iterateIn: ('array'|'object'), iterateUnsetNumeric: boolean}) : Object

Function that maps your instance to a JSON-serializable object. Can also be called an
`encapsulator`. For the `stateObj`, see `tester`. In a property context (for arrays
or objects), returning `undefined` will prevent the addition of the property.

See the `tester` for a discussion of the `stateObj`.

Note that replacement results will themselves be recursed for state changes
and type detection.

###### `replaceAsync` (obj: YourType, stateObj : {ownKeys: boolean, iterateIn: ('array'|'object'), iterateUnsetNumeric: boolean}) : `Typeson.Promise`

Expected to return a `Typeson.Promise` which resolves to the replaced value.
See `replace`.

###### `revive` (obj: Object, stateObj : {}) : YourType

Function that maps your JSON-serializable object into a real instance of your type.
In a property context (for arrays or objects), returning `undefined`
will prevent the addition of the property. To explicitly add `undefined`, see
`Typeson.Undefined`.

##### Sample

```js
const typeson = new Typeson();

function CustomType (foo) {
    this.foo = foo;
}

typeson.register({
  // simple style - provide just a constructor function.
  // This style works for any trivial js class without hidden closures.
  CustomType,

  // Date is native and hides it's internal state.
  // We must define encapsulator and reviver that always works.
  Date: [
    (x) => x instanceof Date, // tester
    (date) => date.getTime(), // encapsulator
    (obj) => new Date(obj)    // reviver
  ],

  RegExp: [
    (x) = x instanceof RegExp,
    (re) => [re.source, re.flags],
    ([source, flags]) => new RegExp(source, flags)
  ]
});

console.log(typeson.stringify({
    ct: new CustomType('hello'),
    d: new Date(),
    r: /foo/giu
}));
// {"ct":{"foo":"hello"},"d":1464049031538,"r":["foo","gi"],
//   $types:{"ct":"CustomType","d":"Date","r":"RegExp"}}
```

###### `reviveAsync` (obj: Object) : YourType

Expected to return a `Typeson.Promise` which resolves to the revived value.
See `revive`.

#### `specialTypeNames` (obj, [stateObj], [opts])

This method returns an array of the unique Typeson type names. To return all
type names including JSON type names or duplicates, use an `encapsulateObserver`.

#### `rootTypeName` (obj, [stateObj], [opts])

This method returns a single type name string of the supplied
object at root: a Typeson type if present or a JSON type otherwise.
This method avoids iterating whole object/array structures.

### Class methods

#### `Typeson.Undefined` class

During encapsulation, `undefined` will not be set for property values,
of objects or arrays (including sparse ones and replaced values)
(`undefined` will be converted to `null` if stringified
anyways). During revival, however, since `undefined` is also used in
this context to indicate a value will not be added, if you wish to
have an explicit `undefined` added, you can return
`new Typeson.Undefined()` to ensure a value is set explicitly to
`undefined`.

This distinction is used by the `undefined` type in `typeson-registry`
to allow reconstruction of explicit `undefined` values (and its
`sparseUndefined` type will ensure that sparse arrays can be
reconstructed).

#### `Typeson.Promise` class

If you have a type which you wish to have resolved asynchronously, you
can can return a `Typeson.Promise` (which works otherwise like a `Promise`)
and call its first supplied argument (`resolve`) when ready.

The reason we expect this class to be used here instead of regular `Promise`s
as types might wish to serialize them in their own manner (or perhaps more
likely, to be able to throw when encountering them if they
are not expected).

##### Sample

```js
function MyAsync (prop) {
    this.prop = prop;
}

const typeson = new Typeson({sync: false}).register({
    myAsyncType: [
        function (x) { return x instanceof MyAsync; },
        function (o) {
            return new Typeson.Promise(function (resolve, reject) {
                setTimeout(function () {
                    // Do something more useful in real code
                    if (Date.now() % 2) {
                        reject(new Error('Better luck next time'));
                        return;
                    }
                    resolve(o.prop);
                }, 800);
            });
        },
        function (data) {
            return new MyAsync(data);
        }
    ]
});

const mya = new MyAsync(500);

(async () => {
const result = await typeson.stringify(mya);
const back = typeson.parse(result, null, {sync: true});
console.log(back.prop); // 500
})();
```

#### `Typeson.toStringTag`

A simple utility for getting the former ``[[Class]]`` internal slot of an object
(i.e., The string between `[Object ` and `]` as returned from
`Object.prototype.toString`) or what is known in HTML as the ["class string"](https://heycam.github.io/webidl/#dfn-class-string).

Since [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)
can set the value for other objects and is defined by JavaScript itself, we
use that within the method name.

The method can be used for cross-frame detection of your objects as well
as objects associated with all
[platform objects](https://heycam.github.io/webidl/#idl-objects)
(i.e., non-callback interfaces or `DOMException`s) tied to WebIDL
(such as the interfaces in HTML). The platform object's [identifier](https://heycam.github.io/webidl/#es-platform-objects) (i.e., the
interface name) is, per the WebIDL spec, the string to be returned.

Although it is unfortunately not immune to forgery, it may in some
cases be more appealing than (or usable in addition to) duck typing
so this tiny utility is bundled for convenience.

#### `Typeson.hasConstructorOf` (objWithPrototypeConstructor, classToCompare: constructor or null) : boolean

Another approach for class comparisons involves checking a `constructor`
function and comparing its `toString`. This is required for some classes
which otherwise do not define `toStringTag`s which differ from other
objects. The first argument will be an object to check (whose prototoype
will be searched for a `constructor` property) whereas the second is a
class constructor to compare.

If no valid `constructor` is found, `false` will be returned unless
`null` was supplied as the `classToCompare` in which case `true` will
be returned when finding a `null` prototype (and `false` otherwise).

#### `Typeson.isObject` (val)

Simple but frequently-needed type-checking utility for
`val && typeof val === 'object'` to avoid `null` being treated as an object.

#### `Typeson.isPlainObject` (val)

Checks for a simple non-inherited object. Adapted from jQuery's `isPlainObject`.

#### `Typeson.isUserObject` (val)

Allows for inherited objects but ensures the prototype chain inherits from
`Object` (or `null`).

#### `Typeson.isThenable` (val, catchCheck=boolean)

Checks whether an object is "thenable" (usable as a promise). If the second
argument is supplied as `true`, it will also ensure it has a `catch` method.
A regular `Promise` or `Typeson.Promise` will return `true`.

#### `Typeson.escapeKeyPathComponent` (unescapedKeyPathComponent)

Escapes a component of a key path.

Dots in property names are escaped as `~1`, and the tilde escape character is
itself escaped as `~0`.

#### `Typeson.unescapeKeyPathComponent` (escapedKeyPathComponent)

Unescapes a key path component. See `Typeson.escapeKeyPathComponent`.

#### `Typeson.getByKeyPath` (obj, keyPath)

Retrieves a value pointed to by a key path on an object.

#### `Typeson.getJSONType` (obj)

Utility that returns 'null', 'boolean', 'number', 'string', 'array',
or 'object' depending on JSON type.

### Class properties

#### `Typeson.JSON_TYPES`

Set to the following array of JSON type names.

`['null', 'boolean', 'number', 'string', 'array', 'object']`

## Finding types and groups of types

[typeson-registry](https://github.com/dfahlander/typeson-registry) contains ready-to-use types and presets to register with your Typeson instances.
