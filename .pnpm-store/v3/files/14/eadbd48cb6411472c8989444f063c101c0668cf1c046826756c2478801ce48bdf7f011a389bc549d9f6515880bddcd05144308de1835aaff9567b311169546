# typeson CHANGES

## 6.1.0

### User-facing

- Enhancement: Adds `Typeson.Promise.allSettled` utility for parity with
    other `Promise` methods

### Dev-facing

- npm: Switch to pnpm
- npm: Update devDeps.

## 6.0.0

### User-facing

- Breaking change: Drop peerDeps (core-js-bundle, regenerator-runtime) and
    avoid need for `regenerator-runtime`
- Docs: Corrected typo (@stephanemagnenat)

### Dev-facing

- Linting: Lint per lasest ash-nazg; lint hidden file
- Build: Use "json" extension on RC file; indicate `default` exports for Rollup
- Editorconfig: Enforce JSON spacing
- Testing: Remove need for bootstrap file
- npm: Add coverage in main `test` script
- npm: Switch to server without reported vulnerabilities (`http-server`)
- npm: Replace deprecated `rollup-plugin-babel` with `@rollup/plugin-babel`
    and make `babelHelpers` `bundled` value explicit
- npm: Update devDeps (including changing updated ash-nazg peerDeps.)

## 5.18.2

- Fix: Avoid treating recurring primitive values as cyclic
- Linting (ESLint): As per latest ash-nazg
- npm: Bump devDeps, peerDeps

## 5.18.1

- npm: Bumped version as package not seeming to be available for download
    despite being published

## 5.18.0

- Enhancement: Allow `TypesonPromise` `all` and `race` to work with
    non-`TypesonPromise`
- Fix: Allow nested plain objects to async revive
- Fix: Have empty keypath at very front, but nested first otherwise
- Fix: Nested `Undefined`
- Fix: Avoid recursion if `undefined` or `NaN`/`Infinity`/`-Infiinity`
    values return the same
- Fix: Ensure `iterateIn` array can have async setting
- Testing: Coverage, Intermediate async types
- Docs: Document removing a previously registered spec;
    update/clarify `hasConstructorOf` `null` behavior

## 5.17.0

- Fix: Restore old behavior of nullish spec potentially replacing
- Enhancement: Allow nullifying previous `testPlainObjects` specs (by
    absence of `test`)
- npm: Bump devDep.

## 5.16.0

- Fix: When checking for "null" constructor, return `true` if object created
    by `Object.create(null)`. This fix only impacts direct use of
    `Typeson.hasConstructorOf`. When internally used in Typeson (or
    `typeson-registry`), it never uses a `null` second argument.
- Fix: Throw proper error upon missing reviver
- Fix: Ensure nullish spec is silently ignored
- Fix: Ensure sorting more nested paths first
- Enhancement: Add `engines` (also used in Unicorn linting rule)
- Testing: Coverage improvements; use mocha and chai
- npm: Split up browser testing to two scripts
- npm: Update devDeps, peerDep (core-js-bundle)

## 5.15.0

- Enhancement: Allow cloning during encapsulation of (non-registered)
    classes using `Symbol.toStringTag` (#17)

## 5.14.1

- Fix: Ensure pointing to existent main CJS file (minified)

## 5.14.0

- Fix: Ensure `this` is defined with old-style function-based type specs
- Fix: Ensure `Undefined` and `TypesonPromise` revivers are correctly
    detected (independent of minification or Babelification).
- Linting (ESLint): Switch to more rigorous config (ash-nazg); jsdoc, etc.
- Linting (ESLint): add any html to linting
- Maintenance: Add `.editorconfig`
- Testing: Add coverage
- npm: Update devDeps/peerDeps

## 5.13.0

- Enhancement: Add ESM dist format (and use in test and
    `package.json`); provide non-minified versions
- Testing: Avoid need for build file (use `esm` and relative path
    for browser test)
- npm: Indicate `core-js-bundle` and `regenerator-runtime` as
    `peerDependencies` (and devDeps) in place of deprecated
    `@babel/polyfill`
- npm: Update `opn-cli` -> `open-cli`; update devDeps; remove now
    unused `rollup-plugin-node-resolve`

## 5.12.0

- Linting (ESLint): Update `polyfills` for compat plugin
- npm: Update devDeps, including Babel potentially impacting build

## 5.11.1

- Fix: Sorting issue with plain object revivers (lgtm.com-inspired fix)
- Refactoring: Avoid useless check (lgtm.com-inspired change)

## 5.11.0

- Fix: Ensure `testPlainObjects` are revived before reference
    resolution and setting (and before other types) so that
    objects-to-arrays will be properly referenced in all cases
    and can thus preserve non-index array properties (fixes #9)
- Fix: Allow `iterateIn === 'object` to override array and create
    object from array
- Fix (`reviveAsync`): Wait until all TypesonPromises resolve (no
    tests still)
- Enhancement: Add state object option to auto-copy array length onto
    array-like object clone
- Optimization: Avoid passing around (unchanging) `opts` within inner
    `revive` handling
- Refactoring: Object property shorthand; avoid shadowing; make return
    explicit; use `slice` over `substr`
- Docs: Further JSDoc
- Testing: Report total passed
- Testing (fix): Ensure using `@babel/polyfill`
- npm/yarn: Update devDep
- npm: Add yarn to `prepublishOnly` to ensure stays up to date with
    npm `package-lock.json`

## 5.10.1

- yarn: Update `yarn.lock`

## 5.10.0

- Fix: Give string tag to `TypesonPromise` to prevent it from passing
    `isUserObject`
- Linting (Markdown): Update per newer API
- npm: Update devDeps

## 5.9.0

- Linting (ESLint): Remove unused file from ignore; apply script to whole
    repo save ignore file; override new "standard" rule with own
    "object-curly-spacing"; avoid Node-11-deprecated `url.parse`
- Linting (ESLint): Actually use compat plugin (identifies need for
    promises and URL polyfills as a minimum on some older browsers to
    get full browser coverage)
- Refactoring: Use object shorthand, destructuring
- Build (Rollup): Switch to terser for minification; avoid plugins where
    not needed
- npm: Update to Babel 7; update other devDeps; switch to
    base64-arraybuffer-es6

## 5.8.2

- Fix: Ensure deleted state object properties are restored
- npm: Update devDeps

## 5.8.1

- Yarn: Update `yarn.lock`
- npm: Add `package-lock.json`

## 5.8.0

- Enhancement: Except for `type` and `replaced` states, preserve state
    object keys (including user-supplied ones) within replacers; add tests
- Enhancement: Pass a state object as the second argument to revivers;
    add tests
- npm: Update devDeps

## 5.7.1

- Fix `.npmignore`

## 5.7.0

- Build: Add Yarn.lock
- npm: Update dev deps

## 5.6.0

- Build: Add minification for its own sake and also avoiding our
    Rollup process (Babel?) unminifying our source and creating inconsistency

## 5.5.0

- Build: Preminimize internally used constructors so basic functionality not
    fragile across multiple Typeson instances

## 5.4.0

- npm: Include typeson.js file with npm in case using as module
    and also include LICENSE (but ignore new test directory)
- npm: Remove build and prepublish scripts (runs on local installs in npm <= 4)
- Build: Switch from Webpack to Rollup
- npm/Testing: add ESLint script to test routines
- npm/Testing: Add browser test file and npm script
- Testing refactoring: Write tests in ES6
- Testing: Add messages for tests missing them
- gitignore: Ignore new auto-generated test file

## 5.3.0

- npm: Add `browser` to `package.json` for bundlers

## 5.2.0

- npm: Add `module` to `package.json` for downstream Rollup/Webpack

## 5.1.0

- For `encapsulateObserver`, report `typeDetected` as `true` when a
    Typeson-detected type is found but no relevant replacer is present
    to be performed.
- For `encapsulateObserver`, report `replacing` as `true` preceding a
    Typeson-detected type replacement. (Can be used to get at the original
    object value before encapsulation)
- npm/Testing: Update dev dependencies

## 5.0.3

- Add back prepublish script to ensure rebuilding upon publish

## 5.0.2

- Ensure build occurs on install

## 5.0.1

- Fix `rootTypeName` to work with promises and for replacements

## 5.0.0

- Breaking change (minor): Throw upon attempts to register objects with JSON type names
- Breaking change (minor): Include JSON type names on `type` property
    of object passed to `encapsulateObserver`
- Enhancement (Basic API): `specialTypeNames` instance method to return array
    of unique Typeson type names
- Enhancement (Basic API): `rootTypeName` instance method to return string of
    Typeson type name at root if present or the JSON type name otherwise
- Enhancement (Basic API): Add `Typeson.getJSONType` class method to return
    `null` and `array` where appropriate or `typeof` otherwise
- Enhancement (Basic API): Add `Typeson.JSON_TYPES` class property to list
    the available JSON types

## 4.0.0

- Breaking change: Use object-based structure on `types` (esp. important
    as more possible properties/methods are added, reliance on array
    ordering will become less manageable/intelligible for users).
- Breaking change: Changed default to optimize and avoid replacement
    checks on arrays unless there is at least one type whose spec has
    `testPlainObjects` set. Brings consistency given that non-array
    plain object types must also have the option set to be discoverable.

- Fix: Allow missing recursive array or object member possibilities
- Fix: Cross-frame/Cross-module plain-object
    (including `Object.create(null)`) and array detection
- Fix: Escape keypaths to avoid conflicts when property names
    include dots; fixes #5
- Fix: Nest inside `$` even if object has `$types` that is non-truthy
    or if it has `$types` but no actual types (with tests)
- Fix: Throw if user attempts to define a type with ID "#"
- Fix: Implementation of pojo registration. The sugar:
    `typeson.register({MyClass});` failed if parsing `undefined`
    or `null` since the tester did not check for that.

- Enhancement (Basic API): Avoid needing a replacer (so that it can add
    state config without modifying the object and e.g., set to iterate
    "in" properties; also can be used for validation only)
- Enhancement (Basic API): Allow `fallback` option to `register` to
    assign lower priority to a later registration addition
- Enhancement (Basic API): Support object-based API in addition to
    function/array (with properties, `test`, `replace`, `revive`);
    `this` context is supplied object
- Enhancement (Basic API): Allow per-method-invocation options on
    `encapsulate`/`stringify`/`revive`/`parse`
- Enhancement (Basic API): Support `encapsulateObserver` callback option
    (sending detected `type` when present), adding tests for sync and async

- Enhancement (Types): Allow `encapsulate` to represent primitives and `revive`
    to revive them as such (e.g., to encode a bare `undefined` in the
    same manner as `undefined` properties)
- Enhancement (Types): Allow revival to return instanceof `Typeson.Undefined`
    to indicate restoring to `undefined`
- Enhancement (Types): Add config `testPlainObjects` (which can
    also work with arrays) to allow (non-recursive) tests and replacements
    for plain objects (or arrays)

- Enhancement (async): `stringifyAsync`, `parseAsync`, `encapsulateAsync`,
    `reviveAsync` methods which return promises; have them use `replaceAsync`
    and `reviveAsync` on type specs where relevant
- Enhancement (async): Add `throwOnBadSyncType` option (defaults to `true`)
    which the `*Sync/Async` methods automatically apply
- Enhancement (async): Rather than relying on Promises proper (which could be
    desired as encapsulation results, at least as targets for throwing
    (e.g., Structured Cloning Throwing in `typeson-registry`)), require
    use of a `Typeson.Promise()` (which supports promise methods) to
    indicate a result is to be obtained asynchronously.

- Enhancement (utility): Expose `isObject`, `isPlainObject`,
    `isUserObject`, and `isThenable` as class methods of `Typeson`
- Enhancement (utility): Allow `Typeson.hasConstructorOf` to be tested against
    classes without constructors
- Enhancement (utility): Add `compareConstructors` method for detection of
    instances like `Intl.Collator` whose `toStringTag` is
    indistinguishable from other classes; document
- Enhancement (utility): Add `Typeson.toStringTag` class method given frequent
    need by types
- Enhancement (utility): Add `escapeKeyPathComponent`,
    `unescapeKeyPathComponent`, and `getByKeyPath` as class methods of
    `Typeson`

- Enhancement (key iteration): Allow setting of `iterateIn` state
    ('object' or 'array') by type methods to give purely modular control
    and ensure iteration on prototype only occurs when set by the type
    (e.g., so not iterating iterating all objects unless detected as such);
    `iterateIn` defaults to not being set.
- Enhancement (key iteration): Allow setting of `iterateUnsetNumeric`
    boolean state object property to give purely modular control
    and ensure iteration of unset (sparse) numeric array indexes only
    occurs when set by the type (e.g., so not iterating iterating all arrays
    unless detected as such); defaults to `false`

- Testing (fix): Prevent `ArrayBuffer` detection clashing with other types
- Testing bugs: Add test for current behavior of replacer
    (tester/encapsulator) ordering
- Testing bugs: Keypaths with property names including dots
- Testing bugs: Test for clashes with objects using own `$` and `$types`
    properties
- Testing bugs: Ensure preventing types with ID "#"
- Testing features: Add encapsulate observer tests
- Testing features: Add `toJSON` tests
- Testing features: Add `Typeson.Promise` `all`/`race` tests
- Testing features: Support promise-based tests

- Docs (README): Document new features
- Docs (README): Describe more of the resulting encapsulated structure
- Docs (README): Document recursive nature of replacements (and promises)
- Docs (README): Indicate sequence upon subsequent `register` calls
- Docs (README): Indicate precedence of testing/encapsulating when an
    array is supplied
- Docs (README): Indicate support for arrays and primitives at root by
    return of new object
- Docs (README): summarize properties and specify types consistently in headers
- Docs (README): Use backticks to set off code references
- Docs (README): Improve headings hierarchy, more descriptions and
    documentation of async/sync methods

- npm: Update dev dependencies

## 3.2.0

- Enhancement: Allow reviver to set the explicit value `undefined` (by
    returning an instance of `Typeson.Undefined`)
- Enhancement: Pass in state objects to tests and replacers so that
    they can vary their results depending on setting (currently only
    whether we are iterating an "own" key property or not)
- Refactoring: Remove redundant nullish-check
- Clean-up: Remove trailing WS, consistent semi-colon usage
- Docs: Consistent and best practices heading hierarchy in README
- Docs: Mention use of tester for throwing exceptions
- Docs: Add docs for `stateObj`
- Docs: Add docs for `undefined` behavior in encapsulators and revivers,
    the use of `Typeson.Undefined` to explicitly add `undefined`
