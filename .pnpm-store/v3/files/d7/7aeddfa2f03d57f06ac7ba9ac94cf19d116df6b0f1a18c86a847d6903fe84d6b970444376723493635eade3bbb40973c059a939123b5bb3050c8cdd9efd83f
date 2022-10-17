/* eslint-disable no-shadow */
/**
 * @file Typeson - JSON with types
 * @license The MIT License (MIT)
 * @copyright (c) 2016-2018 David Fahlander, Brett Zamir
*/

import {TypesonPromise} from './utils/TypesonPromise.js';
import {
    isPlainObject, isObject, hasConstructorOf,
    isThenable, toStringTag, isUserObject,
    escapeKeyPathComponent, unescapeKeyPathComponent,
    getByKeyPath, setAtKeyPath, getJSONType
} from './utils/classMethods.js';

const {keys} = Object,
    {isArray} = Array,
    hasOwn = ({}.hasOwnProperty),
    internalStateObjPropsToIgnore = [
        'type', 'replaced', 'iterateIn', 'iterateUnsetNumeric'
    ];

/**
 * Handle plain object revivers first so reference setting can use
 * revived type (e.g., array instead of object); assumes revived
 * has same structure or will otherwise break subsequent references.
 * @param {PlainObjectType} a
 * @param {PlainObjectType} b
 * @returns {1|-1|boolean}
 */
function nestedPathsFirst (a, b) {
    if (a.keypath === '') {
        return -1;
    }

    let as = a.keypath.match(/\./gu) || 0;
    let bs = b.keypath.match(/\./gu) || 0;
    if (as) {
        as = as.length;
    }
    if (bs) {
        bs = bs.length;
    }
    return as > bs
        ? -1
        : as < bs
            ? 1
            : a.keypath < b.keypath
                ? -1
                : a.keypath > b.keypath;
}

/**
 * @callback Tester
 * @param {any} value
 * @param {StateObject} stateobj
 * @returns {boolean}
 */

/**
* @callback Replacer
* @param {any} value
* @param {StateObject} stateObj
* @returns {any} Should be JSON-stringifiable
*/

/**
* @callback Reviver
* @param {JSON} value
* @param {StateObject} stateObj
* @returns {any}
*/

/**
* @typedef {PlainObject} TypesonOptions
* @property {boolean} stringification Auto-set by `stringify`
*/

/**
 * An instance of this class can be used to call `stringify()` and `parse()`.
 * Typeson resolves cyclic references by default. Can also be extended to
 * support custom types using the register() method.
 *
 * @class
 * @param {{cyclic: boolean}} [options] - if cyclic (default true),
 *   cyclic references will be handled gracefully.
 */
class Typeson {
    /**
     * @param {TypesonOptions} options
     */
    constructor (options) {
        this.options = options;

        // Replacers signature: replace (value). Returns falsy if not
        //   replacing. Otherwise ['Date', value.getTime()]
        this.plainObjectReplacers = [];
        this.nonplainObjectReplacers = [];

        // Revivers: [{type => reviver}, {plain: boolean}].
        //   Sample: [{'Date': value => new Date(value)}, {plain: false}]
        this.revivers = {};

        /** Types registered via `register()`. */
        this.types = {};
    }

    /**
    * @typedef {null|boolean|number|string|GenericArray|PlainObject} JSON
    */

    /**
    * @callback JSONReplacer
    * @param {""|string} key
    * @param {JSON} value
    * @returns {number|string|boolean|null|PlainObject|undefined}
    * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The%20replacer%20parameter
    */

    /**
     * Serialize given object to Typeson.
     * Initial arguments work identical to those of `JSON.stringify`.
     * The `replacer` argument has nothing to do with our replacers.
     * @param {any} obj
     * @param {JSONReplacer|string[]} replacer
     * @param {number|string} space
     * @param {TypesonOptions} opts
     * @returns {string|Promise<string>} Promise resolves to a string
     */
    stringify (obj, replacer, space, opts) {
        opts = {...this.options, ...opts, stringification: true};
        const encapsulated = this.encapsulate(obj, null, opts);
        if (isArray(encapsulated)) {
            return JSON.stringify(encapsulated[0], replacer, space);
        }
        return encapsulated.then((res) => {
            return JSON.stringify(res, replacer, space);
        });
    }

    /**
     * Also sync but throws on non-sync result.
     * @param {any} obj
     * @param {JSONReplacer|string[]} replacer
     * @param {number|string} space
     * @param {TypesonOptions} opts
     * @returns {string}
     */
    stringifySync (obj, replacer, space, opts) {
        return this.stringify(obj, replacer, space, {
            throwOnBadSyncType: true, ...opts, sync: true
        });
    }

    /**
     *
     * @param {any} obj
     * @param {JSONReplacer|string[]} replacer
     * @param {number|string} space
     * @param {TypesonOptions} opts
     * @returns {Promise<string>}
     */
    stringifyAsync (obj, replacer, space, opts) {
        return this.stringify(obj, replacer, space, {
            throwOnBadSyncType: true, ...opts, sync: false
        });
    }

    /**
    * @callback JSONReviver
    * @param {string} key
    * @param {JSON} value
    * @returns {JSON}
    */

    /**
     * Parse Typeson back into an obejct.
     * Initial arguments works identical to those of `JSON.parse()`.
     * @param {string} text
     * @param {JSONReviver} reviver This JSON reviver has nothing to do with
     *   our revivers.
     * @param {TypesonOptions} opts
     * @returns {external:JSON}
     */
    parse (text, reviver, opts) {
        opts = {...this.options, ...opts, parse: true};
        return this.revive(JSON.parse(text, reviver), opts);
    }

    /**
    * Also sync but throws on non-sync result.
    * @param {string} text
    * @param {JSONReviver} reviver This JSON reviver has nothing to do with
    *   our revivers.
    * @param {TypesonOptions} opts
    * @returns {external:JSON}
    */
    parseSync (text, reviver, opts) {
        return this.parse(
            text,
            reviver,
            {throwOnBadSyncType: true, ...opts, sync: true}
        );
    }
    /**
    * @param {string} text
    * @param {JSONReviver} reviver This JSON reviver has nothing to do with
    *   our revivers.
    * @param {TypesonOptions} opts
    * @returns {Promise<external:JSON>} Resolves to `external:JSON`
    */
    parseAsync (text, reviver, opts) {
        return this.parse(
            text,
            reviver,
            {throwOnBadSyncType: true, ...opts, sync: false}
        );
    }

    /**
    * @typedef {} StateObject
    */

    /**
     *
     * @param {any} obj
     * @param {StateObject} stateObj
     * @param {TypesonOptions} [opts={}]
     * @returns {string[]|false}
     */
    specialTypeNames (obj, stateObj, opts = {}) {
        opts.returnTypeNames = true;
        return this.encapsulate(obj, stateObj, opts);
    }

    /**
     *
     * @param {any} obj
     * @param {PlainObject} stateObj
     * @param {PlainObject} [opts={}]
     * @returns {Promise<any>|GenericArray|PlainObject|string|false}
     */
    rootTypeName (obj, stateObj, opts = {}) {
        opts.iterateNone = true;
        return this.encapsulate(obj, stateObj, opts);
    }

    /**
     * Encapsulate a complex object into a plain Object by replacing
     * registered types with plain objects representing the types data.
     *
     * This method is used internally by `Typeson.stringify()`.
     * @param {any} obj - Object to encapsulate.
     * @param {PlainObject} stateObj
     * @param {PlainObject} opts
     * @returns {Promise<any>|GenericArray|PlainObject|string|false}
     */
    encapsulate (obj, stateObj, opts) {
        opts = {sync: true, ...this.options, ...opts};
        const {sync} = opts;

        const that = this,
            types = {},
            refObjs = [], // For checking cyclic references
            refKeys = [], // For checking cyclic references
            promisesDataRoot = [];

        // Clone the object deeply while at the same time replacing any
        //   special types or cyclic reference:
        const cyclic = 'cyclic' in opts ? opts.cyclic : true;
        const {encapsulateObserver} = opts;
        const ret = _encapsulate(
            '', obj, cyclic, stateObj || {},
            promisesDataRoot
        );

        /**
         *
         * @param {any} ret
         * @returns {GenericArray|PlainObject|string|false}
         */
        function finish (ret) {
            // Add `$types` to result only if we ever bumped into a
            //  special type (or special case where object has own `$types`)
            const typeNames = Object.values(types);
            if (opts.iterateNone) {
                if (typeNames.length) {
                    return typeNames[0];
                }
                return Typeson.getJSONType(ret);
            }
            if (typeNames.length) {
                if (opts.returnTypeNames) {
                    return [...new Set(typeNames)];
                }

                // Special if array (or a primitive) was serialized
                //   because JSON would ignore custom `$types` prop on it
                if (!ret || !isPlainObject(ret) ||
                    // Also need to handle if this is an object with its
                    //   own `$types` property (to avoid ambiguity)
                    hasOwn.call(ret, '$types')
                ) {
                    ret = {$: ret, $types: {$: types}};
                } else {
                    ret.$types = types;
                }
            // No special types
            } else if (isObject(ret) && hasOwn.call(ret, '$types')) {
                ret = {$: ret, $types: true};
            }
            if (opts.returnTypeNames) {
                return false;
            }
            return ret;
        }
        /**
         *
         * @param {any} ret
         * @param {GenericArray} promisesData
         * @returns {Promise<any>}
         */
        async function checkPromises (ret, promisesData) {
            const promResults = await Promise.all(
                promisesData.map((pd) => { return pd[1].p; })
            );
            await Promise.all(
                promResults.map(async function (promResult) {
                    const newPromisesData = [];
                    const [prData] = promisesData.splice(0, 1);
                    const [
                        keyPath, , cyclic, stateObj,
                        parentObj, key, detectedType
                    ] = prData;

                    const encaps = _encapsulate(
                        keyPath, promResult, cyclic, stateObj,
                        newPromisesData, true, detectedType
                    );
                    const isTypesonPromise = hasConstructorOf(
                        encaps,
                        TypesonPromise
                    );
                    // Handle case where an embedded custom type itself
                    //   returns a `Typeson.Promise`
                    if (keyPath && isTypesonPromise) {
                        const encaps2 = await encaps.p;
                        parentObj[key] = encaps2;
                        return checkPromises(ret, newPromisesData);
                    }
                    if (keyPath) {
                        parentObj[key] = encaps;
                    } else if (isTypesonPromise) {
                        ret = encaps.p;
                    } else {
                        // If this is itself a `Typeson.Promise` (because the
                        //   original value supplied was a `Promise` or
                        //   because the supplied custom type value resolved
                        //   to one), returning it below will be fine since
                        //   a `Promise` is expected anyways given current
                        //   config (and if not a `Promise`, it will be ready
                        //   as the resolve value)
                        ret = encaps;
                    }
                    return checkPromises(ret, newPromisesData);
                })
            );
            return ret;
        }

        /**
        * @typedef {PlainObject} OwnKeysObject
        * @property {boolean} ownKeys
        */

        /**
        * @callback BuiltinStateObjectPropertiesCallback
        * @returns {void}
        */

        /**
         *
         * @param {StateObject} stateObj
         * @param {OwnKeysObject} ownKeysObj
         * @param {BuiltinStateObjectPropertiesCallback} cb
         * @returns {undefined}
         */
        function _adaptBuiltinStateObjectProperties (
            stateObj, ownKeysObj, cb
        ) {
            Object.assign(stateObj, ownKeysObj);
            const vals = internalStateObjPropsToIgnore.map((prop) => {
                const tmp = stateObj[prop];
                delete stateObj[prop];
                return tmp;
            });
            // eslint-disable-next-line node/callback-return
            cb();
            internalStateObjPropsToIgnore.forEach((prop, i) => {
                stateObj[prop] = vals[i];
            });
        }

        /**
         *
         * @param {string} keypath
         * @param {any} value
         * @param {boolean} cyclic
         * @param {PlainObject} stateObj
         * @param {boolean} promisesData
         * @param {boolean} resolvingTypesonPromise
         * @param {string} detectedType
         * @returns {any}
         */
        function _encapsulate (
            keypath, value, cyclic, stateObj, promisesData,
            resolvingTypesonPromise, detectedType
        ) {
            let ret;
            let observerData = {};
            const $typeof = typeof value;
            const runObserver = encapsulateObserver
                ? function (obj) {
                    const type = detectedType || stateObj.type || (
                        Typeson.getJSONType(value)
                    );
                    encapsulateObserver(Object.assign(obj || observerData, {
                        keypath,
                        value,
                        cyclic,
                        stateObj,
                        promisesData,
                        resolvingTypesonPromise,
                        awaitingTypesonPromise: hasConstructorOf(
                            value,
                            TypesonPromise
                        )
                    }, {type}));
                }
                : null;
            if (['string', 'boolean', 'number', 'undefined'].includes(
                $typeof
            )) {
                if (value === undefined ||
                    (
                        Number.isNaN(value) ||
                            value === Number.NEGATIVE_INFINITY ||
                            value === Number.POSITIVE_INFINITY
                    )
                ) {
                    ret = stateObj.replaced
                        ? value
                        : replace(
                            keypath, value, stateObj, promisesData,
                            false, resolvingTypesonPromise, runObserver
                        );
                    if (ret !== value) {
                        observerData = {replaced: ret};
                    }
                } else {
                    ret = value;
                }
                if (runObserver) {
                    runObserver();
                }
                return ret;
            }
            if (value === null) {
                if (runObserver) {
                    runObserver();
                }
                return value;
            }
            if (cyclic && !stateObj.iterateIn &&
                !stateObj.iterateUnsetNumeric && value &&
                typeof value === 'object'
            ) {
                // Options set to detect cyclic references and be able
                //   to rewrite them.
                const refIndex = refObjs.indexOf(value);
                if (refIndex < 0) {
                    if (cyclic === true) {
                        refObjs.push(value);
                        refKeys.push(keypath);
                    }
                } else {
                    types[keypath] = '#';
                    if (runObserver) {
                        runObserver({
                            cyclicKeypath: refKeys[refIndex]
                        });
                    }
                    return '#' + refKeys[refIndex];
                }
            }
            const isPlainObj = isPlainObject(value);
            const isArr = isArray(value);
            const replaced = (
                // Running replace will cause infinite loop as will test
                //   positive again
                ((isPlainObj || isArr) &&
                    (!that.plainObjectReplacers.length ||
                        stateObj.replaced)) ||
                stateObj.iterateIn
            )
                // Optimization: if plain object and no plain-object
                //   replacers, don't try finding a replacer
                ? value
                : replace(
                    keypath, value, stateObj, promisesData,
                    isPlainObj || isArr,
                    null,
                    runObserver
                );

            let clone;
            if (replaced !== value) {
                ret = replaced;
                observerData = {replaced};
            } else {
                // eslint-disable-next-line no-lonely-if
                if (keypath === '' &&
                    hasConstructorOf(value, TypesonPromise)
                ) {
                    promisesData.push([
                        keypath, value, cyclic, stateObj,
                        undefined, undefined, stateObj.type
                    ]);
                    ret = value;
                } else if ((isArr && stateObj.iterateIn !== 'object') ||
                    stateObj.iterateIn === 'array'
                ) {
                    // eslint-disable-next-line unicorn/no-new-array -- Sparse
                    clone = new Array(value.length);
                    observerData = {clone};
                } else if (
                    (
                        !['function', 'symbol'].includes(typeof value) &&
                        !('toJSON' in value) &&
                        !hasConstructorOf(value, TypesonPromise) &&
                        !hasConstructorOf(value, Promise) &&
                        !hasConstructorOf(value, ArrayBuffer)
                    ) ||
                    isPlainObj ||
                    stateObj.iterateIn === 'object'
                ) {
                    clone = {};
                    if (stateObj.addLength) {
                        clone.length = value.length;
                    }
                    observerData = {clone};
                } else {
                    ret = value; // Only clone vanilla objects and arrays
                }
            }
            if (runObserver) {
                runObserver();
            }

            if (opts.iterateNone) {
                return clone || ret;
            }

            if (!clone) {
                return ret;
            }

            // Iterate object or array
            if (stateObj.iterateIn) {
                // eslint-disable-next-line guard-for-in
                for (const key in value) {
                    const ownKeysObj = {ownKeys: hasOwn.call(value, key)};
                    _adaptBuiltinStateObjectProperties(
                        stateObj,
                        ownKeysObj,
                        () => {
                            const kp = keypath + (keypath ? '.' : '') +
                                escapeKeyPathComponent(key);
                            const val = _encapsulate(
                                kp, value[key], Boolean(cyclic), stateObj,
                                promisesData, resolvingTypesonPromise
                            );
                            if (hasConstructorOf(val, TypesonPromise)) {
                                promisesData.push([
                                    kp, val, Boolean(cyclic), stateObj,
                                    clone, key, stateObj.type
                                ]);
                            } else if (val !== undefined) {
                                clone[key] = val;
                            }
                        }
                    );
                }
                if (runObserver) {
                    runObserver({endIterateIn: true, end: true});
                }
            } else {
                // Note: Non-indexes on arrays won't survive stringify so
                //  somewhat wasteful for arrays, but so too is iterating
                //  all numeric indexes on sparse arrays when not wanted
                //  or filtering own keys for positive integers
                keys(value).forEach(function (key) {
                    const kp = keypath + (keypath ? '.' : '') +
                        escapeKeyPathComponent(key);
                    const ownKeysObj = {ownKeys: true};
                    _adaptBuiltinStateObjectProperties(
                        stateObj,
                        ownKeysObj,
                        () => {
                            const val = _encapsulate(
                                kp, value[key], Boolean(cyclic), stateObj,
                                promisesData, resolvingTypesonPromise
                            );
                            if (hasConstructorOf(val, TypesonPromise)) {
                                promisesData.push([
                                    kp, val, Boolean(cyclic), stateObj,
                                    clone, key, stateObj.type
                                ]);
                            } else if (val !== undefined) {
                                clone[key] = val;
                            }
                        }
                    );
                });
                if (runObserver) {
                    runObserver({endIterateOwn: true, end: true});
                }
            }
            // Iterate array for non-own numeric properties (we can't
            //   replace the prior loop though as it iterates non-integer
            //   keys)
            if (stateObj.iterateUnsetNumeric) {
                const vl = value.length;
                for (let i = 0; i < vl; i++) {
                    if (!(i in value)) {
                        // No need to escape numeric
                        const kp = keypath + (keypath ? '.' : '') + i;

                        const ownKeysObj = {ownKeys: false};
                        _adaptBuiltinStateObjectProperties(
                            stateObj,
                            ownKeysObj,
                            () => {
                                const val = _encapsulate(
                                    kp, undefined, Boolean(cyclic), stateObj,
                                    promisesData, resolvingTypesonPromise
                                );
                                if (hasConstructorOf(val, TypesonPromise)) {
                                    promisesData.push([
                                        kp, val, Boolean(cyclic), stateObj,
                                        clone, i, stateObj.type
                                    ]);
                                } else if (val !== undefined) {
                                    clone[i] = val;
                                }
                            }
                        );
                    }
                }
                if (runObserver) {
                    runObserver({endIterateUnsetNumeric: true, end: true});
                }
            }
            return clone;
        }

        /**
        * @typedef {PlainObject} KeyPathEvent
        * @property {string} cyclicKeypath
        */

        /**
        * @typedef {PlainObject} EndIterateInEvent
        * @property {boolean} endIterateIn
        * @property {boolean} end
        */

        /**
        * @typedef {PlainObject} EndIterateUnsetNumericEvent
        * @property {boolean} endIterateUnsetNumeric
        * @property {boolean} end
        */

        /**
        * @typedef {PlainObject} TypeDetectedEvent
        * @property {boolean} typeDetected
        */

        /**
        * @typedef {PlainObject} ReplacingEvent
        * @property {boolean} replacing
        */

        /**
        * @callback Observer
        * @param {KeyPathEvent|EndIterateInEvent|EndIterateUnsetNumericEvent|
        * TypeDetectedEvent|ReplacingEvent} [event]
        * @returns {void}
        */

        /**
         *
         * @param {string} keypath
         * @param {any} value
         * @param {PlainObject} stateObj
         * @param {GenericArray} promisesData
         * @param {boolean} plainObject
         * @param {boolean} resolvingTypesonPromise
         * @param {Observer} [runObserver]
         * @returns {any}
         */
        function replace (
            keypath, value, stateObj, promisesData, plainObject,
            resolvingTypesonPromise, runObserver
        ) {
            // Encapsulate registered types
            const replacers = plainObject
                ? that.plainObjectReplacers
                : that.nonplainObjectReplacers;
            let i = replacers.length;
            while (i--) {
                const replacer = replacers[i];
                if (replacer.test(value, stateObj)) {
                    const {type} = replacer;
                    if (that.revivers[type]) {
                        // Record the type only if a corresponding reviver
                        //   exists. This is to support specs where only
                        //   replacement is done.
                        // For example, ensuring deep cloning of the object,
                        //   or replacing a type to its equivalent without
                        //   the need to revive it.
                        const existing = types[keypath];
                        // type can comprise an array of types (see test
                        //   "should support intermediate types")
                        types[keypath] = existing
                            ? [type].concat(existing)
                            : type;
                    }
                    Object.assign(stateObj, {type, replaced: true});
                    if ((sync || !replacer.replaceAsync) &&
                        !replacer.replace
                    ) {
                        if (runObserver) {
                            runObserver({typeDetected: true});
                        }
                        return _encapsulate(
                            keypath, value, cyclic && 'readonly', stateObj,
                            promisesData, resolvingTypesonPromise, type
                        );
                    }
                    if (runObserver) {
                        runObserver({replacing: true});
                    }

                    // Now, also traverse the result in case it contains its
                    //   own types to replace
                    const replaceMethod = sync || !replacer.replaceAsync
                        ? 'replace'
                        : 'replaceAsync';
                    return _encapsulate(
                        keypath, replacer[replaceMethod](value, stateObj),
                        cyclic && 'readonly', stateObj, promisesData,
                        resolvingTypesonPromise, type
                    );
                }
            }
            return value;
        }

        return promisesDataRoot.length
            ? sync && opts.throwOnBadSyncType
                ? (() => {
                    throw new TypeError(
                        'Sync method requested but async result obtained'
                    );
                })()
                : Promise.resolve(
                    checkPromises(ret, promisesDataRoot)
                ).then(finish)
            : !sync && opts.throwOnBadSyncType
                ? (() => {
                    throw new TypeError(
                        'Async method requested but sync result obtained'
                    );
                })()
                // If this is a synchronous request for stringification, yet
                //   a promise is the result, we don't want to resolve leading
                //   to an async result, so we return an array to avoid
                //   ambiguity
                : (opts.stringification && sync
                    ? [finish(ret)]
                    : (sync
                        ? finish(ret)
                        : Promise.resolve(finish(ret))
                    ));
    }

    /**
     * Also sync but throws on non-sync result.
     * @param {any} obj
     * @param {StateObject} stateObj
     * @param {TypesonOptions} opts
     * @returns {any}
     */
    encapsulateSync (obj, stateObj, opts) {
        return this.encapsulate(obj, stateObj, {
            throwOnBadSyncType: true, ...opts, sync: true
        });
    }

    /**
     * @param {any} obj
     * @param {StateObject} stateObj
     * @param {TypesonOptions} opts
     * @returns {any}
     */
    encapsulateAsync (obj, stateObj, opts) {
        return this.encapsulate(obj, stateObj, {
            throwOnBadSyncType: true, ...opts, sync: false
        });
    }

    /**
     * Revive an encapsulated object.
     * This method is used internally by `Typeson.parse()`.
     * @param {PlainObject} obj - Object to revive. If it has `$types` member,
     *   the properties that are listed there will be replaced with its true
     *   type instead of just plain objects.
     * @param {TypesonOptions} opts
     * @throws TypeError If mismatch between sync/async type and result
     * @returns {Promise<any>|any} If async, returns a Promise that resolves
     * to `any`.
     */
    revive (obj, opts) {
        let types = obj && obj.$types;

        // No type info added. Revival not needed.
        if (!types) {
            return obj;
        }

        // Object happened to have own `$types` property but with
        //   no actual types, so we unescape and return that object
        if (types === true) {
            return obj.$;
        }

        opts = {sync: true, ...this.options, ...opts};
        const {sync} = opts;
        const keyPathResolutions = [];
        const stateObj = {};

        let ignore$Types = true;
        // Special when root object is not a trivial Object, it will
        //   be encapsulated in `$`. It will also be encapsulated in
        //   `$` if it has its own `$` property to avoid ambiguity
        if (types.$ && isPlainObject(types.$)) {
            obj = obj.$;
            types = types.$;
            ignore$Types = false;
        }

        const that = this;

        /**
         * @callback RevivalReducer
         * @param {any} value
         * @param {string} type
         * @returns {any}
         */

        /**
         *
         * @param {string} type
         * @param {any} val
         * @throws {Error}
         * @returns {any}
         */
        function executeReviver (type, val) {
            const [reviver] = that.revivers[type] || [];
            if (!reviver) {
                throw new Error('Unregistered type: ' + type);
            }

            // Only `sync` expected here, as problematic async would
            //  be missing both `reviver` and `reviverAsync`, and
            //  encapsulation shouldn't have added types, so
            //  should have made an early exit
            if (sync && !('revive' in reviver)) {
                // Just return value as is
                return val;
            }

            return reviver[
                sync && reviver.revive
                    ? 'revive'
                    : !sync && reviver.reviveAsync
                        ? 'reviveAsync'
                        : 'revive'
            ](val, stateObj);
        }

        /**
         *
         * @returns {void|TypesonPromise<void>}
         */
        function revivePlainObjects () {
            // const references = [];
            // const reviveTypes = [];
            const plainObjectTypes = [];
            Object.entries(types).forEach(([
                keypath, type
            ]) => {
                if (type === '#') {
                    /*
                    references.push({
                        keypath,
                        reference: getByKeyPath(obj, keypath)
                    });
                    */
                    return;
                }
                [].concat(type).forEach(function (type) {
                    const [, {plain}] = that.revivers[type] || [null, {}];
                    if (!plain) {
                        // reviveTypes.push({keypath, type});
                        return;
                    }
                    plainObjectTypes.push({keypath, type});
                    delete types[keypath]; // Avoid repeating
                });
            });
            if (!plainObjectTypes.length) {
                return undefined;
            }

            // console.log(plainObjectTypes.sort(nestedPathsFirst));
            /**
            * @typedef {PlainObject} PlainObjectType
            * @property {string} keypath
            * @property {string} type
            */
            return plainObjectTypes.sort(nestedPathsFirst).reduce(
                function reducer (possibleTypesonPromise, {
                    keypath, type
                }) {
                    if (isThenable(possibleTypesonPromise)) {
                        return possibleTypesonPromise.then((val) => {
                            return reducer(val, {
                                keypath, type
                            });
                        });
                    }
                    // console.log('obj', JSON.stringify(keypath), obj);
                    let val = getByKeyPath(obj, keypath);
                    val = executeReviver(type, val);

                    if (hasConstructorOf(
                        val, TypesonPromise
                    )) {
                        return val.then((v) => {
                            const newVal = setAtKeyPath(
                                obj, keypath, v
                            );
                            if (newVal === v) {
                                obj = newVal;
                            }
                            return undefined;
                        });
                    }
                    const newVal = setAtKeyPath(obj, keypath, val);
                    if (newVal === val) {
                        obj = newVal;
                    }
                    return undefined;
                },
                undefined // This argument must be explicit
            );
            // references.forEach(({keypath, reference}) => {});
            // reviveTypes.sort(nestedPathsFirst).forEach(() => {});
        }

        const revivalPromises = [];
        /**
         *
         * @param {string} keypath
         * @param {any} value
         * @param {?(GenericArray|PlainObject)} target
         * @param {GenericArray|PlainObject} [clone]
         * @param {string} [key]
         * @returns {any}
         */
        function _revive (keypath, value, target, clone, key) {
            if (ignore$Types && keypath === '$types') {
                return undefined;
            }
            const type = types[keypath];
            const isArr = isArray(value);
            if (isArr || isPlainObject(value)) {
                // eslint-disable-next-line unicorn/no-new-array -- Sparse
                const clone = isArr ? new Array(value.length) : {};
                // Iterate object or array
                keys(value).forEach((k) => {
                    const val = _revive(
                        keypath + (keypath ? '.' : '') +
                            escapeKeyPathComponent(k),
                        value[k],
                        target || clone,
                        clone,
                        k
                    );
                    const set = (v) => {
                        if (hasConstructorOf(v, Undefined)) {
                            clone[k] = undefined;
                        } else if (v !== undefined) {
                            clone[k] = v;
                        }
                        return v;
                    };
                    if (hasConstructorOf(val, TypesonPromise)) {
                        revivalPromises.push(
                            val.then((ret) => {
                                return set(ret);
                            })
                        );
                    } else {
                        set(val);
                    }
                });
                value = clone;
                // Try to resolve cyclic reference as soon as available
                while (keyPathResolutions.length) {
                    const [[target, keyPath, clone, k]] = keyPathResolutions;
                    const val = getByKeyPath(target, keyPath);
                    // Typeson.Undefined not expected here as not cyclic or
                    //   `undefined`
                    if (val !== undefined) {
                        clone[k] = val;
                    } else {
                        break;
                    }
                    keyPathResolutions.splice(0, 1);
                }
            }
            if (!type) {
                return value;
            }
            if (type === '#') {
                const ret = getByKeyPath(target, value.slice(1));
                if (ret === undefined) { // Cyclic reference not yet available
                    keyPathResolutions.push([
                        target, value.slice(1), clone, key
                    ]);
                }
                return ret;
            }

            // `type` can be an array here
            return [].concat(type).reduce(function reducer (val, typ) {
                if (hasConstructorOf(val, TypesonPromise)) {
                    return val.then((v) => { // TypesonPromise here too
                        return reducer(v, typ);
                    });
                }
                return executeReviver(typ, val);
            }, value);
        }

        /**
         *
         * @param {any} retrn
         * @returns {undefined|any}
         */
        function checkUndefined (retrn) {
            return hasConstructorOf(retrn, Undefined) ? undefined : retrn;
        }

        const possibleTypesonPromise = revivePlainObjects();
        let ret;
        if (hasConstructorOf(possibleTypesonPromise, TypesonPromise)) {
            ret = possibleTypesonPromise.then(() => {
                return obj;
            });
        } else {
            ret = _revive('', obj, null);
            if (revivalPromises.length) {
                // Ensure children resolved
                ret = TypesonPromise.resolve(ret).then((r) => {
                    return TypesonPromise.all([
                        // May be a TypesonPromise or not
                        r,
                        ...revivalPromises
                    ]);
                }).then(([r]) => {
                    return r;
                });
            }
        }

        return isThenable(ret)
            ? sync && opts.throwOnBadSyncType
                ? (() => {
                    throw new TypeError(
                        'Sync method requested but async result obtained'
                    );
                })()
                : hasConstructorOf(ret, TypesonPromise)
                    ? ret.p.then(checkUndefined)
                    : ret
            : !sync && opts.throwOnBadSyncType
                ? (() => {
                    throw new TypeError(
                        'Async method requested but sync result obtained'
                    );
                })()
                : sync
                    ? checkUndefined(ret)
                    : Promise.resolve(checkUndefined(ret));
    }

    /**
     * Also sync but throws on non-sync result.
     * @param {any} obj
     * @param {TypesonOptions} opts
     * @returns {any}
     */
    reviveSync (obj, opts) {
        return this.revive(obj, {
            throwOnBadSyncType: true, ...opts, sync: true
        });
    }

    /**
    * @param {any} obj
    * @param {TypesonOptions} opts
    * @returns {Promise<any>}
    */
    reviveAsync (obj, opts) {
        return this.revive(obj, {
            throwOnBadSyncType: true, ...opts, sync: false
        });
    }

    /**
    * @typedef {Tester|Replacer|Reviver} Spec
    */

    /**
     * Register types.
     * For examples on how to use this method, see
     *   {@link https://github.com/dfahlander/typeson-registry/tree/master/types}.
     * @param {object<string,Spec[]>[]} typeSpecSets -
     * Types and their functions [test, encapsulate, revive];
     * @param {TypesonOptions} opts
     * @returns {Typeson}
     */
    register (typeSpecSets, opts) {
        opts = opts || {};
        [].concat(typeSpecSets).forEach(function R (typeSpec) {
            // Allow arrays of arrays of arrays...
            if (isArray(typeSpec)) {
                return typeSpec.map((typSpec) => R.call(this, typSpec));
            }
            typeSpec && keys(typeSpec).forEach(function (typeId) {
                if (typeId === '#') {
                    throw new TypeError(
                        '# cannot be used as a type name as it is reserved ' +
                        'for cyclic objects'
                    );
                } else if (Typeson.JSON_TYPES.includes(typeId)) {
                    throw new TypeError(
                        'Plain JSON object types are reserved as type names'
                    );
                }
                let spec = typeSpec[typeId];
                const replacers = spec && spec.testPlainObjects
                    ? this.plainObjectReplacers
                    : this.nonplainObjectReplacers;
                const existingReplacer = replacers.filter(function (r) {
                    return r.type === typeId;
                });
                if (existingReplacer.length) {
                    // Remove existing spec and replace with this one.
                    replacers.splice(replacers.indexOf(existingReplacer[0]), 1);
                    delete this.revivers[typeId];
                    delete this.types[typeId];
                }
                if (typeof spec === 'function') {
                    // Support registering just a class without replacer/reviver
                    const Class = spec;
                    spec = {
                        test: (x) => x && x.constructor === Class,
                        replace: (x) => ({...x}),
                        revive: (x) => Object.assign(
                            Object.create(Class.prototype), x
                        )
                    };
                } else if (isArray(spec)) {
                    const [test, replace, revive] = spec;
                    spec = {test, replace, revive};
                }
                if (!spec || !spec.test) {
                    return;
                }

                const replacerObj = {
                    type: typeId,
                    test: spec.test.bind(spec)
                };
                if (spec.replace) {
                    replacerObj.replace = spec.replace.bind(spec);
                }
                if (spec.replaceAsync) {
                    replacerObj.replaceAsync = spec.replaceAsync.bind(spec);
                }
                const start = typeof opts.fallback === 'number'
                    ? opts.fallback
                    : (opts.fallback ? 0 : Number.POSITIVE_INFINITY);
                if (spec.testPlainObjects) {
                    this.plainObjectReplacers.splice(start, 0, replacerObj);
                } else {
                    this.nonplainObjectReplacers.splice(start, 0, replacerObj);
                }
                // Todo: We might consider a testAsync type
                if (spec.revive || spec.reviveAsync) {
                    const reviverObj = {};
                    if (spec.revive) {
                        reviverObj.revive = spec.revive.bind(spec);
                    }
                    if (spec.reviveAsync) {
                        reviverObj.reviveAsync = spec.reviveAsync.bind(spec);
                    }
                    this.revivers[typeId] = [reviverObj, {
                        plain: spec.testPlainObjects
                    }];
                }

                // Record to be retrieved via public types property.
                this.types[typeId] = spec;
            }, this);
        }, this);
        return this;
    }
}

/**
 * We keep this function minimized so if using two instances of this
 * library, where one is minimized and one is not, it will still work
 * with `hasConstructorOf`.
 * @class
 */
class Undefined{} // eslint-disable-line space-before-blocks

Undefined.__typeson__type__ = 'TypesonUndefined';

// The following provide classes meant to avoid clashes with other values

// To insist `undefined` should be added
Typeson.Undefined = Undefined;
// To support async encapsulation/stringification
Typeson.Promise = TypesonPromise;

// Some fundamental type-checking utilities
Typeson.isThenable = isThenable;
Typeson.toStringTag = toStringTag;
Typeson.hasConstructorOf = hasConstructorOf;
Typeson.isObject = isObject;
Typeson.isPlainObject = isPlainObject;
Typeson.isUserObject = isUserObject;

Typeson.escapeKeyPathComponent = escapeKeyPathComponent;
Typeson.unescapeKeyPathComponent = unescapeKeyPathComponent;
Typeson.getByKeyPath = getByKeyPath;
Typeson.getJSONType = getJSONType;
Typeson.JSON_TYPES = [
    'null', 'boolean', 'number', 'string', 'array', 'object'
];

export default Typeson;
