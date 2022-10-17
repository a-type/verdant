(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Typeson = factory());
}(this, (function () { 'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  /**
  * @callback TypesonFulfilled
  * @returns {Promise<any>|any}
  */

  /**
  * @callback TypesonRejected
  * @returns {Promise<any>|any}
  */

  /**
   * @callback TypesonResolve
   * @param {any} value
   * @returns {Promise<any>}
   */

  /**
   * @callback TypesonReject
   * @param {Error|any} error
   * @returns {Promise<any>}
   */

  /**
   * @callback TypesonResolveReject
   * @param {TypesonResolve} typesonResolve
   * @param {TypesonReject} typesonReject
   * @returns {Promise<any>}
   */

  /* eslint-disable block-spacing, space-before-function-paren,
    space-before-blocks, space-infix-ops, semi, promise/avoid-new,
    jsdoc/require-jsdoc */

  /**
   * We keep this function minimized so if using two instances of this
   *   library, where one is minimized and one is not, it will still work
   *   with `hasConstructorOf`.
   * With ES6 classes, we may be able to simply use `class TypesonPromise
   *   extends Promise` and add a string tag for detection.
   * @param {TypesonResolveReject} f
   */
  var TypesonPromise = function TypesonPromise(f) {
    _classCallCheck(this, TypesonPromise);

    this.p = new Promise(f);
  };
  /* eslint-enable block-spacing, space-before-function-paren,
    space-before-blocks, space-infix-ops, semi, promise/avoid-new,
    jsdoc/require-jsdoc */
  // eslint-disable-next-line max-len
  // class TypesonPromise extends Promise {get[Symbol.toStringTag](){return 'TypesonPromise'};} // eslint-disable-line keyword-spacing, space-before-function-paren, space-before-blocks, block-spacing, semi


  TypesonPromise.__typeson__type__ = 'TypesonPromise'; // Note: core-js-bundle provides a `Symbol` polyfill

  /* istanbul ignore else */

  if (typeof Symbol !== 'undefined') {
    // Ensure `isUserObject` will return `false` for `TypesonPromise`
    TypesonPromise.prototype[Symbol.toStringTag] = 'TypesonPromise';
  }
  /**
   *
   * @param {TypesonFulfilled} [onFulfilled]
   * @param {TypesonRejected} [onRejected]
   * @returns {TypesonPromise}
   */


  TypesonPromise.prototype.then = function (onFulfilled, onRejected) {
    var _this = this;

    return new TypesonPromise(function (typesonResolve, typesonReject) {
      // eslint-disable-next-line promise/catch-or-return
      _this.p.then(function (res) {
        // eslint-disable-next-line promise/always-return
        typesonResolve(onFulfilled ? onFulfilled(res) : res);
      })["catch"](function (res) {
        return onRejected ? onRejected(res) : Promise.reject(res);
      }).then(typesonResolve, typesonReject);
    });
  };
  /**
   *
   * @param {TypesonRejected} onRejected
   * @returns {TypesonPromise}
   */


  TypesonPromise.prototype["catch"] = function (onRejected) {
    return this.then(null, onRejected);
  };
  /**
   *
   * @param {any} v
   * @returns {TypesonPromise}
   */


  TypesonPromise.resolve = function (v) {
    return new TypesonPromise(function (typesonResolve) {
      typesonResolve(v);
    });
  };
  /**
   *
   * @param {any} v
   * @returns {TypesonPromise}
   */


  TypesonPromise.reject = function (v) {
    return new TypesonPromise(function (typesonResolve, typesonReject) {
      typesonReject(v);
    });
  };

  ['all', 'race', 'allSettled'].forEach(function (meth) {
    /**
     *
     * @param {Promise<any>[]} promArr
     * @returns {TypesonPromise}
     */
    TypesonPromise[meth] = function (promArr) {
      return new TypesonPromise(function (typesonResolve, typesonReject) {
        // eslint-disable-next-line promise/catch-or-return
        Promise[meth](promArr.map(function (prom) {
          return prom && prom.constructor && prom.constructor.__typeson__type__ === 'TypesonPromise' ? prom.p : prom;
        })).then(typesonResolve, typesonReject);
      });
    };
  });

  var _ref = {},
      toStr = _ref.toString,
      hasOwn$1 = {}.hasOwnProperty,
      getProto = Object.getPrototypeOf,
      fnToString = hasOwn$1.toString;
  /**
   * Second argument not in use internally, but provided for utility.
   * @param {any} v
   * @param {boolean} catchCheck
   * @returns {boolean}
   */

  function isThenable(v, catchCheck) {
    return isObject(v) && typeof v.then === 'function' && (!catchCheck || typeof v["catch"] === 'function');
  }
  /**
   *
   * @param {any} val
   * @returns {string}
   */


  function toStringTag(val) {
    return toStr.call(val).slice(8, -1);
  }
  /**
   * This function is dependent on both constructors
   *   being identical so any minimization is expected of both.
   * @param {any} a
   * @param {GenericFunction} b
   * @returns {boolean}
   */


  function hasConstructorOf(a, b) {
    if (!a || _typeof(a) !== 'object') {
      return false;
    }

    var proto = getProto(a);

    if (!proto) {
      return b === null;
    }

    var Ctor = hasOwn$1.call(proto, 'constructor') && proto.constructor;

    if (typeof Ctor !== 'function') {
      return b === null;
    }

    if (b === Ctor) {
      return true;
    }

    if (b !== null && fnToString.call(Ctor) === fnToString.call(b)) {
      return true;
    }

    if (typeof b === 'function' && typeof Ctor.__typeson__type__ === 'string' && Ctor.__typeson__type__ === b.__typeson__type__) {
      return true;
    }

    return false;
  }
  /**
   *
   * @param {any} val
   * @returns {boolean}
   */


  function isPlainObject(val) {
    // Mirrors jQuery's
    if (!val || toStringTag(val) !== 'Object') {
      return false;
    }

    var proto = getProto(val);

    if (!proto) {
      // `Object.create(null)`
      return true;
    }

    return hasConstructorOf(val, Object);
  }
  /**
   *
   * @param {any} val
   * @returns {boolean}
   */


  function isUserObject(val) {
    if (!val || toStringTag(val) !== 'Object') {
      return false;
    }

    var proto = getProto(val);

    if (!proto) {
      // `Object.create(null)`
      return true;
    }

    return hasConstructorOf(val, Object) || isUserObject(proto);
  }
  /**
   *
   * @param {any} v
   * @returns {boolean}
   */


  function isObject(v) {
    return v && _typeof(v) === 'object';
  }
  /**
   *
   * @param {string} keyPathComponent
   * @returns {string}
   */


  function escapeKeyPathComponent(keyPathComponent) {
    return keyPathComponent.replace(/~/g, '~0').replace(/\./g, '~1');
  }
  /**
   *
   * @param {string} keyPathComponent
   * @returns {string}
   */


  function unescapeKeyPathComponent(keyPathComponent) {
    return keyPathComponent.replace(/~1/g, '.').replace(/~0/g, '~');
  }
  /**
   * @param {PlainObject|GenericArray} obj
   * @param {string} keyPath
   * @returns {any}
   */


  function getByKeyPath(obj, keyPath) {
    if (keyPath === '') {
      return obj;
    }

    var period = keyPath.indexOf('.');

    if (period > -1) {
      var innerObj = obj[unescapeKeyPathComponent(keyPath.slice(0, period))];
      return innerObj === undefined ? undefined : getByKeyPath(innerObj, keyPath.slice(period + 1));
    }

    return obj[unescapeKeyPathComponent(keyPath)];
  }
  /**
   *
   * @param {PlainObject} obj
   * @param {string} keyPath
   * @param {any} value
   * @returns {any}
   */


  function setAtKeyPath(obj, keyPath, value) {
    if (keyPath === '') {
      return value;
    }

    var period = keyPath.indexOf('.');

    if (period > -1) {
      var innerObj = obj[unescapeKeyPathComponent(keyPath.slice(0, period))];
      return setAtKeyPath(innerObj, keyPath.slice(period + 1), value);
    }

    obj[unescapeKeyPathComponent(keyPath)] = value;
    return obj;
  }
  /**
   *
   * @param {external:JSON} value
   * @returns {"null"|"array"|"undefined"|"boolean"|"number"|"string"|
   *  "object"|"symbol"}
   */


  function getJSONType(value) {
    return value === null ? 'null' : Array.isArray(value) ? 'array' : _typeof(value);
  }

  function _await(value, then, direct) {
    if (direct) {
      return then ? then(value) : value;
    }

    if (!value || !value.then) {
      value = Promise.resolve(value);
    }

    return then ? value.then(then) : value;
  }

  var keys = Object.keys,
      isArray = Array.isArray,
      hasOwn = {}.hasOwnProperty,
      internalStateObjPropsToIgnore = ['type', 'replaced', 'iterateIn', 'iterateUnsetNumeric'];
  /**
   * Handle plain object revivers first so reference setting can use
   * revived type (e.g., array instead of object); assumes revived
   * has same structure or will otherwise break subsequent references.
   * @param {PlainObjectType} a
   * @param {PlainObjectType} b
   * @returns {1|-1|boolean}
   */

  function _async(f) {
    return function () {
      for (var args = [], i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      try {
        return Promise.resolve(f.apply(this, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
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


  function _invoke(body, then) {
    var result = body();

    if (result && result.then) {
      return result.then(then);
    }

    return then(result);
  }

  function nestedPathsFirst(a, b) {
    if (a.keypath === '') {
      return -1;
    }

    var as = a.keypath.match(/\./g) || 0;
    var bs = b.keypath.match(/\./g) || 0;

    if (as) {
      as = as.length;
    }

    if (bs) {
      bs = bs.length;
    }

    return as > bs ? -1 : as < bs ? 1 : a.keypath < b.keypath ? -1 : a.keypath > b.keypath;
  }

  var Typeson = /*#__PURE__*/function () {
    /**
     * @param {TypesonOptions} options
     */
    function Typeson(options) {
      _classCallCheck(this, Typeson);

      this.options = options; // Replacers signature: replace (value). Returns falsy if not
      //   replacing. Otherwise ['Date', value.getTime()]

      this.plainObjectReplacers = [];
      this.nonplainObjectReplacers = []; // Revivers: [{type => reviver}, {plain: boolean}].
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


    _createClass(Typeson, [{
      key: "stringify",
      value: function stringify(obj, replacer, space, opts) {
        opts = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), opts), {}, {
          stringification: true
        });
        var encapsulated = this.encapsulate(obj, null, opts);

        if (isArray(encapsulated)) {
          return JSON.stringify(encapsulated[0], replacer, space);
        }

        return encapsulated.then(function (res) {
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

    }, {
      key: "stringifySync",
      value: function stringifySync(obj, replacer, space, opts) {
        return this.stringify(obj, replacer, space, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: true
        }));
      }
      /**
       *
       * @param {any} obj
       * @param {JSONReplacer|string[]} replacer
       * @param {number|string} space
       * @param {TypesonOptions} opts
       * @returns {Promise<string>}
       */

    }, {
      key: "stringifyAsync",
      value: function stringifyAsync(obj, replacer, space, opts) {
        return this.stringify(obj, replacer, space, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: false
        }));
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

    }, {
      key: "parse",
      value: function parse(text, reviver, opts) {
        opts = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), opts), {}, {
          parse: true
        });
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

    }, {
      key: "parseSync",
      value: function parseSync(text, reviver, opts) {
        return this.parse(text, reviver, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: true
        }));
      }
      /**
      * @param {string} text
      * @param {JSONReviver} reviver This JSON reviver has nothing to do with
      *   our revivers.
      * @param {TypesonOptions} opts
      * @returns {Promise<external:JSON>} Resolves to `external:JSON`
      */

    }, {
      key: "parseAsync",
      value: function parseAsync(text, reviver, opts) {
        return this.parse(text, reviver, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: false
        }));
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

    }, {
      key: "specialTypeNames",
      value: function specialTypeNames(obj, stateObj) {
        var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
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

    }, {
      key: "rootTypeName",
      value: function rootTypeName(obj, stateObj) {
        var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
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

    }, {
      key: "encapsulate",
      value: function encapsulate(obj, stateObj, opts) {
        /**
         *
         * @param {any} ret
         * @param {GenericArray} promisesData
         * @returns {Promise<any>}
         */
        var checkPromises = _async(function (ret, promisesData) {
          return _await(Promise.all(promisesData.map(function (pd) {
            return pd[1].p;
          })), function (promResults) {
            return _await(Promise.all(promResults.map(_async(function (promResult) {
              var _exit = false;
              var newPromisesData = [];

              var _promisesData$splice = promisesData.splice(0, 1),
                  _promisesData$splice2 = _slicedToArray(_promisesData$splice, 1),
                  prData = _promisesData$splice2[0];

              var _prData = _slicedToArray(prData, 7),
                  keyPath = _prData[0],
                  cyclic = _prData[2],
                  stateObj = _prData[3],
                  parentObj = _prData[4],
                  key = _prData[5],
                  detectedType = _prData[6];

              var encaps = _encapsulate(keyPath, promResult, cyclic, stateObj, newPromisesData, true, detectedType);

              var isTypesonPromise = hasConstructorOf(encaps, TypesonPromise); // Handle case where an embedded custom type itself
              //   returns a `Typeson.Promise`

              return _invoke(function () {
                if (keyPath && isTypesonPromise) {
                  return _await(encaps.p, function (encaps2) {
                    parentObj[key] = encaps2;
                    _exit = true;
                    return checkPromises(ret, newPromisesData);
                  });
                }
              }, function (_result) {
                if (_exit) return _result;

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
              });
            }))), function () {
              return ret;
            });
          });
        });
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


        opts = _objectSpread2(_objectSpread2({
          sync: true
        }, this.options), opts);
        var _opts = opts,
            sync = _opts.sync;
        var that = this,
            types = {},
            refObjs = [],
            // For checking cyclic references
        refKeys = [],
            // For checking cyclic references
        promisesDataRoot = []; // Clone the object deeply while at the same time replacing any
        //   special types or cyclic reference:

        var cyclic = 'cyclic' in opts ? opts.cyclic : true;
        var _opts2 = opts,
            encapsulateObserver = _opts2.encapsulateObserver;

        var ret = _encapsulate('', obj, cyclic, stateObj || {}, promisesDataRoot);
        /**
         *
         * @param {any} ret
         * @returns {GenericArray|PlainObject|string|false}
         */


        function finish(ret) {
          // Add `$types` to result only if we ever bumped into a
          //  special type (or special case where object has own `$types`)
          var typeNames = Object.values(types);

          if (opts.iterateNone) {
            if (typeNames.length) {
              return typeNames[0];
            }

            return Typeson.getJSONType(ret);
          }

          if (typeNames.length) {
            if (opts.returnTypeNames) {
              return _toConsumableArray(new Set(typeNames));
            } // Special if array (or a primitive) was serialized
            //   because JSON would ignore custom `$types` prop on it


            if (!ret || !isPlainObject(ret) || // Also need to handle if this is an object with its
            //   own `$types` property (to avoid ambiguity)
            hasOwn.call(ret, '$types')) {
              ret = {
                $: ret,
                $types: {
                  $: types
                }
              };
            } else {
              ret.$types = types;
            } // No special types

          } else if (isObject(ret) && hasOwn.call(ret, '$types')) {
            ret = {
              $: ret,
              $types: true
            };
          }

          if (opts.returnTypeNames) {
            return false;
          }

          return ret;
        }

        function _adaptBuiltinStateObjectProperties(stateObj, ownKeysObj, cb) {
          Object.assign(stateObj, ownKeysObj);
          var vals = internalStateObjPropsToIgnore.map(function (prop) {
            var tmp = stateObj[prop];
            delete stateObj[prop];
            return tmp;
          }); // eslint-disable-next-line node/callback-return

          cb();
          internalStateObjPropsToIgnore.forEach(function (prop, i) {
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


        function _encapsulate(keypath, value, cyclic, stateObj, promisesData, resolvingTypesonPromise, detectedType) {
          var ret;
          var observerData = {};

          var $typeof = _typeof(value);

          var runObserver = encapsulateObserver ? function (obj) {
            var type = detectedType || stateObj.type || Typeson.getJSONType(value);
            encapsulateObserver(Object.assign(obj || observerData, {
              keypath: keypath,
              value: value,
              cyclic: cyclic,
              stateObj: stateObj,
              promisesData: promisesData,
              resolvingTypesonPromise: resolvingTypesonPromise,
              awaitingTypesonPromise: hasConstructorOf(value, TypesonPromise)
            }, {
              type: type
            }));
          } : null;

          if (['string', 'boolean', 'number', 'undefined'].includes($typeof)) {
            if (value === undefined || Number.isNaN(value) || value === Number.NEGATIVE_INFINITY || value === Number.POSITIVE_INFINITY) {
              ret = stateObj.replaced ? value : replace(keypath, value, stateObj, promisesData, false, resolvingTypesonPromise, runObserver);

              if (ret !== value) {
                observerData = {
                  replaced: ret
                };
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

          if (cyclic && !stateObj.iterateIn && !stateObj.iterateUnsetNumeric && value && _typeof(value) === 'object') {
            // Options set to detect cyclic references and be able
            //   to rewrite them.
            var refIndex = refObjs.indexOf(value);

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

          var isPlainObj = isPlainObject(value);
          var isArr = isArray(value);
          var replaced = // Running replace will cause infinite loop as will test
          //   positive again
          (isPlainObj || isArr) && (!that.plainObjectReplacers.length || stateObj.replaced) || stateObj.iterateIn ? // Optimization: if plain object and no plain-object
          //   replacers, don't try finding a replacer
          value : replace(keypath, value, stateObj, promisesData, isPlainObj || isArr, null, runObserver);
          var clone;

          if (replaced !== value) {
            ret = replaced;
            observerData = {
              replaced: replaced
            };
          } else {
            // eslint-disable-next-line no-lonely-if
            if (keypath === '' && hasConstructorOf(value, TypesonPromise)) {
              promisesData.push([keypath, value, cyclic, stateObj, undefined, undefined, stateObj.type]);
              ret = value;
            } else if (isArr && stateObj.iterateIn !== 'object' || stateObj.iterateIn === 'array') {
              // eslint-disable-next-line unicorn/no-new-array -- Sparse
              clone = new Array(value.length);
              observerData = {
                clone: clone
              };
            } else if (!['function', 'symbol'].includes(_typeof(value)) && !('toJSON' in value) && !hasConstructorOf(value, TypesonPromise) && !hasConstructorOf(value, Promise) && !hasConstructorOf(value, ArrayBuffer) || isPlainObj || stateObj.iterateIn === 'object') {
              clone = {};

              if (stateObj.addLength) {
                clone.length = value.length;
              }

              observerData = {
                clone: clone
              };
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
          } // Iterate object or array


          if (stateObj.iterateIn) {
            var _loop = function _loop(key) {
              var ownKeysObj = {
                ownKeys: hasOwn.call(value, key)
              };

              _adaptBuiltinStateObjectProperties(stateObj, ownKeysObj, function () {
                var kp = keypath + (keypath ? '.' : '') + escapeKeyPathComponent(key);

                var val = _encapsulate(kp, value[key], Boolean(cyclic), stateObj, promisesData, resolvingTypesonPromise);

                if (hasConstructorOf(val, TypesonPromise)) {
                  promisesData.push([kp, val, Boolean(cyclic), stateObj, clone, key, stateObj.type]);
                } else if (val !== undefined) {
                  clone[key] = val;
                }
              });
            };

            // eslint-disable-next-line guard-for-in
            for (var key in value) {
              _loop(key);
            }

            if (runObserver) {
              runObserver({
                endIterateIn: true,
                end: true
              });
            }
          } else {
            // Note: Non-indexes on arrays won't survive stringify so
            //  somewhat wasteful for arrays, but so too is iterating
            //  all numeric indexes on sparse arrays when not wanted
            //  or filtering own keys for positive integers
            keys(value).forEach(function (key) {
              var kp = keypath + (keypath ? '.' : '') + escapeKeyPathComponent(key);
              var ownKeysObj = {
                ownKeys: true
              };

              _adaptBuiltinStateObjectProperties(stateObj, ownKeysObj, function () {
                var val = _encapsulate(kp, value[key], Boolean(cyclic), stateObj, promisesData, resolvingTypesonPromise);

                if (hasConstructorOf(val, TypesonPromise)) {
                  promisesData.push([kp, val, Boolean(cyclic), stateObj, clone, key, stateObj.type]);
                } else if (val !== undefined) {
                  clone[key] = val;
                }
              });
            });

            if (runObserver) {
              runObserver({
                endIterateOwn: true,
                end: true
              });
            }
          } // Iterate array for non-own numeric properties (we can't
          //   replace the prior loop though as it iterates non-integer
          //   keys)


          if (stateObj.iterateUnsetNumeric) {
            var vl = value.length;

            var _loop2 = function _loop2(i) {
              if (!(i in value)) {
                // No need to escape numeric
                var kp = keypath + (keypath ? '.' : '') + i;
                var ownKeysObj = {
                  ownKeys: false
                };

                _adaptBuiltinStateObjectProperties(stateObj, ownKeysObj, function () {
                  var val = _encapsulate(kp, undefined, Boolean(cyclic), stateObj, promisesData, resolvingTypesonPromise);

                  if (hasConstructorOf(val, TypesonPromise)) {
                    promisesData.push([kp, val, Boolean(cyclic), stateObj, clone, i, stateObj.type]);
                  } else if (val !== undefined) {
                    clone[i] = val;
                  }
                });
              }
            };

            for (var i = 0; i < vl; i++) {
              _loop2(i);
            }

            if (runObserver) {
              runObserver({
                endIterateUnsetNumeric: true,
                end: true
              });
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


        function replace(keypath, value, stateObj, promisesData, plainObject, resolvingTypesonPromise, runObserver) {
          // Encapsulate registered types
          var replacers = plainObject ? that.plainObjectReplacers : that.nonplainObjectReplacers;
          var i = replacers.length;

          while (i--) {
            var replacer = replacers[i];

            if (replacer.test(value, stateObj)) {
              var type = replacer.type;

              if (that.revivers[type]) {
                // Record the type only if a corresponding reviver
                //   exists. This is to support specs where only
                //   replacement is done.
                // For example, ensuring deep cloning of the object,
                //   or replacing a type to its equivalent without
                //   the need to revive it.
                var existing = types[keypath]; // type can comprise an array of types (see test
                //   "should support intermediate types")

                types[keypath] = existing ? [type].concat(existing) : type;
              }

              Object.assign(stateObj, {
                type: type,
                replaced: true
              });

              if ((sync || !replacer.replaceAsync) && !replacer.replace) {
                if (runObserver) {
                  runObserver({
                    typeDetected: true
                  });
                }

                return _encapsulate(keypath, value, cyclic && 'readonly', stateObj, promisesData, resolvingTypesonPromise, type);
              }

              if (runObserver) {
                runObserver({
                  replacing: true
                });
              } // Now, also traverse the result in case it contains its
              //   own types to replace


              var replaceMethod = sync || !replacer.replaceAsync ? 'replace' : 'replaceAsync';
              return _encapsulate(keypath, replacer[replaceMethod](value, stateObj), cyclic && 'readonly', stateObj, promisesData, resolvingTypesonPromise, type);
            }
          }

          return value;
        }

        return promisesDataRoot.length ? sync && opts.throwOnBadSyncType ? function () {
          throw new TypeError('Sync method requested but async result obtained');
        }() : Promise.resolve(checkPromises(ret, promisesDataRoot)).then(finish) : !sync && opts.throwOnBadSyncType ? function () {
          throw new TypeError('Async method requested but sync result obtained');
        }() // If this is a synchronous request for stringification, yet
        //   a promise is the result, we don't want to resolve leading
        //   to an async result, so we return an array to avoid
        //   ambiguity
        : opts.stringification && sync ? [finish(ret)] : sync ? finish(ret) : Promise.resolve(finish(ret));
      }
      /**
       * Also sync but throws on non-sync result.
       * @param {any} obj
       * @param {StateObject} stateObj
       * @param {TypesonOptions} opts
       * @returns {any}
       */

    }, {
      key: "encapsulateSync",
      value: function encapsulateSync(obj, stateObj, opts) {
        return this.encapsulate(obj, stateObj, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: true
        }));
      }
      /**
       * @param {any} obj
       * @param {StateObject} stateObj
       * @param {TypesonOptions} opts
       * @returns {any}
       */

    }, {
      key: "encapsulateAsync",
      value: function encapsulateAsync(obj, stateObj, opts) {
        return this.encapsulate(obj, stateObj, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: false
        }));
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

    }, {
      key: "revive",
      value: function revive(obj, opts) {
        var types = obj && obj.$types; // No type info added. Revival not needed.

        if (!types) {
          return obj;
        } // Object happened to have own `$types` property but with
        //   no actual types, so we unescape and return that object


        if (types === true) {
          return obj.$;
        }

        opts = _objectSpread2(_objectSpread2({
          sync: true
        }, this.options), opts);
        var _opts3 = opts,
            sync = _opts3.sync;
        var keyPathResolutions = [];
        var stateObj = {};
        var ignore$Types = true; // Special when root object is not a trivial Object, it will
        //   be encapsulated in `$`. It will also be encapsulated in
        //   `$` if it has its own `$` property to avoid ambiguity

        if (types.$ && isPlainObject(types.$)) {
          obj = obj.$;
          types = types.$;
          ignore$Types = false;
        }

        var that = this;
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

        function executeReviver(type, val) {
          var _ref = that.revivers[type] || [],
              _ref2 = _slicedToArray(_ref, 1),
              reviver = _ref2[0];

          if (!reviver) {
            throw new Error('Unregistered type: ' + type);
          } // Only `sync` expected here, as problematic async would
          //  be missing both `reviver` and `reviverAsync`, and
          //  encapsulation shouldn't have added types, so
          //  should have made an early exit


          if (sync && !('revive' in reviver)) {
            // Just return value as is
            return val;
          }

          return reviver[sync && reviver.revive ? 'revive' : !sync && reviver.reviveAsync ? 'reviveAsync' : 'revive'](val, stateObj);
        }
        /**
         *
         * @returns {void|TypesonPromise<void>}
         */


        function revivePlainObjects() {
          // const references = [];
          // const reviveTypes = [];
          var plainObjectTypes = [];
          Object.entries(types).forEach(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2),
                keypath = _ref4[0],
                type = _ref4[1];

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
              var _ref5 = that.revivers[type] || [null, {}],
                  _ref6 = _slicedToArray(_ref5, 2),
                  plain = _ref6[1].plain;

              if (!plain) {
                // reviveTypes.push({keypath, type});
                return;
              }

              plainObjectTypes.push({
                keypath: keypath,
                type: type
              });
              delete types[keypath]; // Avoid repeating
            });
          });

          if (!plainObjectTypes.length) {
            return undefined;
          } // console.log(plainObjectTypes.sort(nestedPathsFirst));

          /**
          * @typedef {PlainObject} PlainObjectType
          * @property {string} keypath
          * @property {string} type
          */


          return plainObjectTypes.sort(nestedPathsFirst).reduce(function reducer(possibleTypesonPromise, _ref7) {
            var keypath = _ref7.keypath,
                type = _ref7.type;

            if (isThenable(possibleTypesonPromise)) {
              return possibleTypesonPromise.then(function (val) {
                return reducer(val, {
                  keypath: keypath,
                  type: type
                });
              });
            } // console.log('obj', JSON.stringify(keypath), obj);


            var val = getByKeyPath(obj, keypath);
            val = executeReviver(type, val);

            if (hasConstructorOf(val, TypesonPromise)) {
              return val.then(function (v) {
                var newVal = setAtKeyPath(obj, keypath, v);

                if (newVal === v) {
                  obj = newVal;
                }

                return undefined;
              });
            }

            var newVal = setAtKeyPath(obj, keypath, val);

            if (newVal === val) {
              obj = newVal;
            }

            return undefined;
          }, undefined // This argument must be explicit
          ); // references.forEach(({keypath, reference}) => {});
          // reviveTypes.sort(nestedPathsFirst).forEach(() => {});
        }

        var revivalPromises = [];
        /**
         *
         * @param {string} keypath
         * @param {any} value
         * @param {?(GenericArray|PlainObject)} target
         * @param {GenericArray|PlainObject} [clone]
         * @param {string} [key]
         * @returns {any}
         */

        function _revive(keypath, value, target, clone, key) {
          if (ignore$Types && keypath === '$types') {
            return undefined;
          }

          var type = types[keypath];
          var isArr = isArray(value);

          if (isArr || isPlainObject(value)) {
            // eslint-disable-next-line unicorn/no-new-array -- Sparse
            var _clone = isArr ? new Array(value.length) : {}; // Iterate object or array


            keys(value).forEach(function (k) {
              var val = _revive(keypath + (keypath ? '.' : '') + escapeKeyPathComponent(k), value[k], target || _clone, _clone, k);

              var set = function set(v) {
                if (hasConstructorOf(v, Undefined)) {
                  _clone[k] = undefined;
                } else if (v !== undefined) {
                  _clone[k] = v;
                }

                return v;
              };

              if (hasConstructorOf(val, TypesonPromise)) {
                revivalPromises.push(val.then(function (ret) {
                  return set(ret);
                }));
              } else {
                set(val);
              }
            });
            value = _clone; // Try to resolve cyclic reference as soon as available

            while (keyPathResolutions.length) {
              var _keyPathResolutions$ = _slicedToArray(keyPathResolutions[0], 4),
                  _target = _keyPathResolutions$[0],
                  keyPath = _keyPathResolutions$[1],
                  _clone2 = _keyPathResolutions$[2],
                  k = _keyPathResolutions$[3];

              var val = getByKeyPath(_target, keyPath); // Typeson.Undefined not expected here as not cyclic or
              //   `undefined`

              if (val !== undefined) {
                _clone2[k] = val;
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
            var _ret = getByKeyPath(target, value.slice(1));

            if (_ret === undefined) {
              // Cyclic reference not yet available
              keyPathResolutions.push([target, value.slice(1), clone, key]);
            }

            return _ret;
          } // `type` can be an array here


          return [].concat(type).reduce(function reducer(val, typ) {
            if (hasConstructorOf(val, TypesonPromise)) {
              return val.then(function (v) {
                // TypesonPromise here too
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


        function checkUndefined(retrn) {
          return hasConstructorOf(retrn, Undefined) ? undefined : retrn;
        }

        var possibleTypesonPromise = revivePlainObjects();
        var ret;

        if (hasConstructorOf(possibleTypesonPromise, TypesonPromise)) {
          ret = possibleTypesonPromise.then(function () {
            return obj;
          });
        } else {
          ret = _revive('', obj, null);

          if (revivalPromises.length) {
            // Ensure children resolved
            ret = TypesonPromise.resolve(ret).then(function (r) {
              return TypesonPromise.all([// May be a TypesonPromise or not
              r].concat(revivalPromises));
            }).then(function (_ref8) {
              var _ref9 = _slicedToArray(_ref8, 1),
                  r = _ref9[0];

              return r;
            });
          }
        }

        return isThenable(ret) ? sync && opts.throwOnBadSyncType ? function () {
          throw new TypeError('Sync method requested but async result obtained');
        }() : hasConstructorOf(ret, TypesonPromise) ? ret.p.then(checkUndefined) : ret : !sync && opts.throwOnBadSyncType ? function () {
          throw new TypeError('Async method requested but sync result obtained');
        }() : sync ? checkUndefined(ret) : Promise.resolve(checkUndefined(ret));
      }
      /**
       * Also sync but throws on non-sync result.
       * @param {any} obj
       * @param {TypesonOptions} opts
       * @returns {any}
       */

    }, {
      key: "reviveSync",
      value: function reviveSync(obj, opts) {
        return this.revive(obj, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: true
        }));
      }
      /**
      * @param {any} obj
      * @param {TypesonOptions} opts
      * @returns {Promise<any>}
      */

    }, {
      key: "reviveAsync",
      value: function reviveAsync(obj, opts) {
        return this.revive(obj, _objectSpread2(_objectSpread2({
          throwOnBadSyncType: true
        }, opts), {}, {
          sync: false
        }));
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

    }, {
      key: "register",
      value: function register(typeSpecSets, opts) {
        opts = opts || {};
        [].concat(typeSpecSets).forEach(function R(typeSpec) {
          var _this = this;

          // Allow arrays of arrays of arrays...
          if (isArray(typeSpec)) {
            return typeSpec.map(function (typSpec) {
              return R.call(_this, typSpec);
            });
          }

          typeSpec && keys(typeSpec).forEach(function (typeId) {
            if (typeId === '#') {
              throw new TypeError('# cannot be used as a type name as it is reserved ' + 'for cyclic objects');
            } else if (Typeson.JSON_TYPES.includes(typeId)) {
              throw new TypeError('Plain JSON object types are reserved as type names');
            }

            var spec = typeSpec[typeId];
            var replacers = spec && spec.testPlainObjects ? this.plainObjectReplacers : this.nonplainObjectReplacers;
            var existingReplacer = replacers.filter(function (r) {
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
              var Class = spec;
              spec = {
                test: function test(x) {
                  return x && x.constructor === Class;
                },
                replace: function replace(x) {
                  return _objectSpread2({}, x);
                },
                revive: function revive(x) {
                  return Object.assign(Object.create(Class.prototype), x);
                }
              };
            } else if (isArray(spec)) {
              var _spec = spec,
                  _spec2 = _slicedToArray(_spec, 3),
                  test = _spec2[0],
                  replace = _spec2[1],
                  revive = _spec2[2];

              spec = {
                test: test,
                replace: replace,
                revive: revive
              };
            }

            if (!spec || !spec.test) {
              return;
            }

            var replacerObj = {
              type: typeId,
              test: spec.test.bind(spec)
            };

            if (spec.replace) {
              replacerObj.replace = spec.replace.bind(spec);
            }

            if (spec.replaceAsync) {
              replacerObj.replaceAsync = spec.replaceAsync.bind(spec);
            }

            var start = typeof opts.fallback === 'number' ? opts.fallback : opts.fallback ? 0 : Number.POSITIVE_INFINITY;

            if (spec.testPlainObjects) {
              this.plainObjectReplacers.splice(start, 0, replacerObj);
            } else {
              this.nonplainObjectReplacers.splice(start, 0, replacerObj);
            } // Todo: We might consider a testAsync type


            if (spec.revive || spec.reviveAsync) {
              var reviverObj = {};

              if (spec.revive) {
                reviverObj.revive = spec.revive.bind(spec);
              }

              if (spec.reviveAsync) {
                reviverObj.reviveAsync = spec.reviveAsync.bind(spec);
              }

              this.revivers[typeId] = [reviverObj, {
                plain: spec.testPlainObjects
              }];
            } // Record to be retrieved via public types property.


            this.types[typeId] = spec;
          }, this);
        }, this);
        return this;
      }
    }]);

    return Typeson;
  }();
  /**
   * We keep this function minimized so if using two instances of this
   * library, where one is minimized and one is not, it will still work
   * with `hasConstructorOf`.
   * @class
   */


  var Undefined = function Undefined() {
    _classCallCheck(this, Undefined);
  }; // eslint-disable-line space-before-blocks


  Undefined.__typeson__type__ = 'TypesonUndefined'; // The following provide classes meant to avoid clashes with other values
  // To insist `undefined` should be added

  Typeson.Undefined = Undefined; // To support async encapsulation/stringification

  Typeson.Promise = TypesonPromise; // Some fundamental type-checking utilities

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
  Typeson.JSON_TYPES = ['null', 'boolean', 'number', 'string', 'array', 'object'];

  return Typeson;

})));
