(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.realisticStructuredClone = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var DOMException = _dereq_('domexception');
var Typeson = _dereq_('typeson');
var structuredCloningThrowing = _dereq_('typeson-registry/dist/presets/structured-cloning-throwing');

// http://stackoverflow.com/a/33268326/786644 - works in browser, worker, and Node.js
var globalVar = typeof window !== 'undefined' ? window : typeof WorkerGlobalScope !== 'undefined' ? self : typeof global !== 'undefined' ? global : Function('return this;')();

if (!globalVar.DOMException) {
    globalVar.DOMException = DOMException;
}

var TSON = new Typeson().register(structuredCloningThrowing);

function realisticStructuredClone(obj) {
    return TSON.revive(TSON.encapsulate(obj));
}

module.exports = realisticStructuredClone;

},{"domexception":5,"typeson":8,"typeson-registry/dist/presets/structured-cloning-throwing":7}],2:[function(_dereq_,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var legacyErrorCodes = _dereq_("./legacy-error-codes.json");
var idlUtils = _dereq_("./utils.js");

exports.implementation = function () {
  function DOMExceptionImpl(_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        message = _ref2[0],
        name = _ref2[1];

    _classCallCheck(this, DOMExceptionImpl);

    this.name = name;
    this.message = message;
  }

  _createClass(DOMExceptionImpl, [{
    key: "code",
    get: function get() {
      return legacyErrorCodes[this.name] || 0;
    }
  }]);

  return DOMExceptionImpl;
}();

// A proprietary V8 extension that causes the stack property to appear.
exports.init = function (impl) {
  if (Error.captureStackTrace) {
    var wrapper = idlUtils.wrapperForImpl(impl);
    Error.captureStackTrace(wrapper, wrapper.constructor);
  }
};

},{"./legacy-error-codes.json":4,"./utils.js":6}],3:[function(_dereq_,module,exports){
"use strict";

var conversions = _dereq_("webidl-conversions");
var utils = _dereq_("./utils.js");

var impl = utils.implSymbol;

function DOMException() {
  var args = [];
  for (var i = 0; i < arguments.length && i < 2; ++i) {
    args[i] = arguments[i];
  }

  if (args[0] !== undefined) {
    args[0] = conversions["DOMString"](args[0], { context: "Failed to construct 'DOMException': parameter 1" });
  } else {
    args[0] = "";
  }

  if (args[1] !== undefined) {
    args[1] = conversions["DOMString"](args[1], { context: "Failed to construct 'DOMException': parameter 2" });
  } else {
    args[1] = "Error";
  }

  iface.setup(this, args);
}

Object.defineProperty(DOMException, "prototype", {
  value: DOMException.prototype,
  writable: false,
  enumerable: false,
  configurable: false
});

Object.defineProperty(DOMException.prototype, "name", {
  get: function get() {
    return this[impl]["name"];
  },


  enumerable: true,
  configurable: true
});

Object.defineProperty(DOMException.prototype, "message", {
  get: function get() {
    return this[impl]["message"];
  },


  enumerable: true,
  configurable: true
});

Object.defineProperty(DOMException.prototype, "code", {
  get: function get() {
    return this[impl]["code"];
  },


  enumerable: true,
  configurable: true
});

Object.defineProperty(DOMException, "INDEX_SIZE_ERR", {
  value: 1,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INDEX_SIZE_ERR", {
  value: 1,
  enumerable: true
});

Object.defineProperty(DOMException, "DOMSTRING_SIZE_ERR", {
  value: 2,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "DOMSTRING_SIZE_ERR", {
  value: 2,
  enumerable: true
});

Object.defineProperty(DOMException, "HIERARCHY_REQUEST_ERR", {
  value: 3,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "HIERARCHY_REQUEST_ERR", {
  value: 3,
  enumerable: true
});

Object.defineProperty(DOMException, "WRONG_DOCUMENT_ERR", {
  value: 4,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "WRONG_DOCUMENT_ERR", {
  value: 4,
  enumerable: true
});

Object.defineProperty(DOMException, "INVALID_CHARACTER_ERR", {
  value: 5,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INVALID_CHARACTER_ERR", {
  value: 5,
  enumerable: true
});

Object.defineProperty(DOMException, "NO_DATA_ALLOWED_ERR", {
  value: 6,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NO_DATA_ALLOWED_ERR", {
  value: 6,
  enumerable: true
});

Object.defineProperty(DOMException, "NO_MODIFICATION_ALLOWED_ERR", {
  value: 7,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NO_MODIFICATION_ALLOWED_ERR", {
  value: 7,
  enumerable: true
});

Object.defineProperty(DOMException, "NOT_FOUND_ERR", {
  value: 8,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NOT_FOUND_ERR", {
  value: 8,
  enumerable: true
});

Object.defineProperty(DOMException, "NOT_SUPPORTED_ERR", {
  value: 9,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NOT_SUPPORTED_ERR", {
  value: 9,
  enumerable: true
});

Object.defineProperty(DOMException, "INUSE_ATTRIBUTE_ERR", {
  value: 10,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INUSE_ATTRIBUTE_ERR", {
  value: 10,
  enumerable: true
});

Object.defineProperty(DOMException, "INVALID_STATE_ERR", {
  value: 11,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INVALID_STATE_ERR", {
  value: 11,
  enumerable: true
});

Object.defineProperty(DOMException, "SYNTAX_ERR", {
  value: 12,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "SYNTAX_ERR", {
  value: 12,
  enumerable: true
});

Object.defineProperty(DOMException, "INVALID_MODIFICATION_ERR", {
  value: 13,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INVALID_MODIFICATION_ERR", {
  value: 13,
  enumerable: true
});

Object.defineProperty(DOMException, "NAMESPACE_ERR", {
  value: 14,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NAMESPACE_ERR", {
  value: 14,
  enumerable: true
});

Object.defineProperty(DOMException, "INVALID_ACCESS_ERR", {
  value: 15,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INVALID_ACCESS_ERR", {
  value: 15,
  enumerable: true
});

Object.defineProperty(DOMException, "VALIDATION_ERR", {
  value: 16,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "VALIDATION_ERR", {
  value: 16,
  enumerable: true
});

Object.defineProperty(DOMException, "TYPE_MISMATCH_ERR", {
  value: 17,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "TYPE_MISMATCH_ERR", {
  value: 17,
  enumerable: true
});

Object.defineProperty(DOMException, "SECURITY_ERR", {
  value: 18,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "SECURITY_ERR", {
  value: 18,
  enumerable: true
});

Object.defineProperty(DOMException, "NETWORK_ERR", {
  value: 19,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "NETWORK_ERR", {
  value: 19,
  enumerable: true
});

Object.defineProperty(DOMException, "ABORT_ERR", {
  value: 20,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "ABORT_ERR", {
  value: 20,
  enumerable: true
});

Object.defineProperty(DOMException, "URL_MISMATCH_ERR", {
  value: 21,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "URL_MISMATCH_ERR", {
  value: 21,
  enumerable: true
});

Object.defineProperty(DOMException, "QUOTA_EXCEEDED_ERR", {
  value: 22,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "QUOTA_EXCEEDED_ERR", {
  value: 22,
  enumerable: true
});

Object.defineProperty(DOMException, "TIMEOUT_ERR", {
  value: 23,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "TIMEOUT_ERR", {
  value: 23,
  enumerable: true
});

Object.defineProperty(DOMException, "INVALID_NODE_TYPE_ERR", {
  value: 24,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "INVALID_NODE_TYPE_ERR", {
  value: 24,
  enumerable: true
});

Object.defineProperty(DOMException, "DATA_CLONE_ERR", {
  value: 25,
  enumerable: true
});
Object.defineProperty(DOMException.prototype, "DATA_CLONE_ERR", {
  value: 25,
  enumerable: true
});

Object.defineProperty(DOMException.prototype, Symbol.toStringTag, {
  value: "DOMException",
  writable: false,
  enumerable: false,
  configurable: true
});

var iface = {
  mixedInto: [],
  is: function is(obj) {
    if (obj) {
      if (obj[impl] instanceof Impl.implementation) {
        return true;
      }
      for (var i = 0; i < module.exports.mixedInto.length; ++i) {
        if (obj instanceof module.exports.mixedInto[i]) {
          return true;
        }
      }
    }
    return false;
  },
  isImpl: function isImpl(obj) {
    if (obj) {
      if (obj instanceof Impl.implementation) {
        return true;
      }

      var wrapper = utils.wrapperForImpl(obj);
      for (var i = 0; i < module.exports.mixedInto.length; ++i) {
        if (wrapper instanceof module.exports.mixedInto[i]) {
          return true;
        }
      }
    }
    return false;
  },
  convert: function convert(obj) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$context = _ref.context,
        context = _ref$context === undefined ? "The provided value" : _ref$context;

    if (module.exports.is(obj)) {
      return utils.implForWrapper(obj);
    }
    throw new TypeError(context + " is not of type 'DOMException'.");
  },
  create: function create(constructorArgs, privateData) {
    var obj = Object.create(DOMException.prototype);
    this.setup(obj, constructorArgs, privateData);
    return obj;
  },
  createImpl: function createImpl(constructorArgs, privateData) {
    var obj = Object.create(DOMException.prototype);
    this.setup(obj, constructorArgs, privateData);
    return utils.implForWrapper(obj);
  },
  _internalSetup: function _internalSetup(obj) {},
  setup: function setup(obj, constructorArgs, privateData) {
    if (!privateData) privateData = {};

    privateData.wrapper = obj;

    this._internalSetup(obj);
    Object.defineProperty(obj, impl, {
      value: new Impl.implementation(constructorArgs, privateData),
      writable: false,
      enumerable: false,
      configurable: true
    });
    obj[impl][utils.wrapperSymbol] = obj;
    if (Impl.init) {
      Impl.init(obj[impl], privateData);
    }
  },

  interface: DOMException,
  expose: {
    Window: { DOMException: DOMException },
    Worker: { DOMException: DOMException }
  }
}; // iface
module.exports = iface;

var Impl = _dereq_(".//DOMException-impl.js");

},{".//DOMException-impl.js":2,"./utils.js":6,"webidl-conversions":9}],4:[function(_dereq_,module,exports){
module.exports={
  "IndexSizeError": 1,
  "DOMStringSizeError": 2,
  "HierarchyRequestError": 3,
  "WrongDocumentError": 4,
  "InvalidCharacterError": 5,
  "NoDataAllowedError": 6,
  "NoModificationAllowedError": 7,
  "NotFoundError": 8,
  "NotSupportedError": 9,
  "InUseAttributeError": 10,
  "InvalidStateError": 11,
  "SyntaxError": 12,
  "InvalidModificationError": 13,
  "NamespaceError": 14,
  "InvalidAccessError": 15,
  "ValidationError": 16,
  "TypeMismatchError": 17,
  "SecurityError": 18,
  "NetworkError": 19,
  "AbortError": 20,
  "URLMismatchError": 21,
  "QuotaExceededError": 22,
  "TimeoutError": 23,
  "InvalidNodeTypeError": 24,
  "DataCloneError": 25
}

},{}],5:[function(_dereq_,module,exports){
"use strict";

module.exports = _dereq_("./DOMException").interface;

Object.setPrototypeOf(module.exports.prototype, Error.prototype);

},{"./DOMException":3}],6:[function(_dereq_,module,exports){
"use strict";

// Returns "Type(value) is Object" in ES terminology.

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function isObject(value) {
  return (typeof value === "undefined" ? "undefined" : _typeof(value)) === "object" && value !== null || typeof value === "function";
}

function getReferenceToBytes(bufferSource) {
  // Node.js' Buffer does not allow subclassing for now, so we can get away with a prototype object check for perf.
  if (Object.getPrototypeOf(bufferSource) === Buffer.prototype) {
    return bufferSource;
  }
  if (bufferSource instanceof ArrayBuffer) {
    return Buffer.from(bufferSource);
  }
  return Buffer.from(bufferSource.buffer, bufferSource.byteOffset, bufferSource.byteLength);
}

function getCopyToBytes(bufferSource) {
  return Buffer.from(getReferenceToBytes(bufferSource));
}

function mixin(target, source) {
  var keys = Object.getOwnPropertyNames(source);
  for (var i = 0; i < keys.length; ++i) {
    if (keys[i] in target) {
      continue;
    }

    Object.defineProperty(target, keys[i], Object.getOwnPropertyDescriptor(source, keys[i]));
  }
}

var wrapperSymbol = Symbol("wrapper");
var implSymbol = Symbol("impl");
var sameObjectCaches = Symbol("SameObject caches");

function getSameObject(wrapper, prop, creator) {
  if (!wrapper[sameObjectCaches]) {
    wrapper[sameObjectCaches] = Object.create(null);
  }

  if (prop in wrapper[sameObjectCaches]) {
    return wrapper[sameObjectCaches][prop];
  }

  wrapper[sameObjectCaches][prop] = creator();
  return wrapper[sameObjectCaches][prop];
}

function wrapperForImpl(impl) {
  return impl ? impl[wrapperSymbol] : null;
}

function implForWrapper(wrapper) {
  return wrapper ? wrapper[implSymbol] : null;
}

function tryWrapperForImpl(impl) {
  var wrapper = wrapperForImpl(impl);
  return wrapper ? wrapper : impl;
}

function tryImplForWrapper(wrapper) {
  var impl = implForWrapper(wrapper);
  return impl ? impl : wrapper;
}

var iterInternalSymbol = Symbol("internal");
var IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));

module.exports = exports = {
  isObject: isObject,
  getReferenceToBytes: getReferenceToBytes,
  getCopyToBytes: getCopyToBytes,
  mixin: mixin,
  wrapperSymbol: wrapperSymbol,
  implSymbol: implSymbol,
  getSameObject: getSameObject,
  wrapperForImpl: wrapperForImpl,
  implForWrapper: implForWrapper,
  tryWrapperForImpl: tryWrapperForImpl,
  tryImplForWrapper: tryImplForWrapper,
  iterInternalSymbol: iterInternalSymbol,
  IteratorPrototype: IteratorPrototype
};

},{}],7:[function(_dereq_,module,exports){
"use strict";

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

!function (e, t) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof2(exports)) && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : ((e = "undefined" != typeof globalThis ? globalThis : e || self).Typeson = e.Typeson || {}, e.Typeson.presets = e.Typeson.presets || {}, e.Typeson.presets.structuredCloningThrowing = t());
}(undefined, function () {
  "use strict";
  function _typeof$1(e) {
    return (_typeof$1 = "function" == typeof Symbol && "symbol" == _typeof2(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : _typeof2(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : _typeof2(e);
    })(e);
  }function _classCallCheck$1(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function _defineProperties$1(e, t) {
    for (var r = 0; r < t.length; r++) {
      var n = t[r];n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n);
    }
  }function _defineProperty$1(e, t, r) {
    return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }function ownKeys$1(e, t) {
    var r = Object.keys(e);if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);t && (n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })), r.push.apply(r, n);
    }return r;
  }function _toConsumableArray$1(e) {
    return function _arrayWithoutHoles$1(e) {
      if (Array.isArray(e)) return _arrayLikeToArray$1(e);
    }(e) || function _iterableToArray$1(e) {
      if ("undefined" != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
    }(e) || function _unsupportedIterableToArray$1(e, t) {
      if (!e) return;if ("string" == typeof e) return _arrayLikeToArray$1(e, t);var r = Object.prototype.toString.call(e).slice(8, -1);"Object" === r && e.constructor && (r = e.constructor.name);if ("Map" === r || "Set" === r) return Array.from(e);if ("Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return _arrayLikeToArray$1(e, t);
    }(e) || function _nonIterableSpread$1() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }function _arrayLikeToArray$1(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var r = 0, n = new Array(t); r < t; r++) {
      n[r] = e[r];
    }return n;
  }function _typeof(e) {
    return (_typeof = "function" == typeof Symbol && "symbol" == _typeof2(Symbol.iterator) ? function _typeof(e) {
      return typeof e === "undefined" ? "undefined" : _typeof2(e);
    } : function _typeof(e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : _typeof2(e);
    })(e);
  }function _classCallCheck(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function _defineProperties(e, t) {
    for (var r = 0; r < t.length; r++) {
      var n = t[r];n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n);
    }
  }function _defineProperty(e, t, r) {
    return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }function ownKeys(e, t) {
    var r = Object.keys(e);if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);t && (n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })), r.push.apply(r, n);
    }return r;
  }function _objectSpread2(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = null != arguments[t] ? arguments[t] : {};t % 2 ? ownKeys(Object(r), !0).forEach(function (t) {
        _defineProperty(e, t, r[t]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : ownKeys(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }return e;
  }function _slicedToArray(e, t) {
    return function _arrayWithHoles(e) {
      if (Array.isArray(e)) return e;
    }(e) || function _iterableToArrayLimit(e, t) {
      if ("undefined" == typeof Symbol || !(Symbol.iterator in Object(e))) return;var r = [],
          n = !0,
          i = !1,
          o = void 0;try {
        for (var a, c = e[Symbol.iterator](); !(n = (a = c.next()).done) && (r.push(a.value), !t || r.length !== t); n = !0) {}
      } catch (e) {
        i = !0, o = e;
      } finally {
        try {
          n || null == c.return || c.return();
        } finally {
          if (i) throw o;
        }
      }return r;
    }(e, t) || _unsupportedIterableToArray(e, t) || function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }function _toConsumableArray(e) {
    return function _arrayWithoutHoles(e) {
      if (Array.isArray(e)) return _arrayLikeToArray(e);
    }(e) || function _iterableToArray(e) {
      if ("undefined" != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
    }(e) || _unsupportedIterableToArray(e) || function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }function _unsupportedIterableToArray(e, t) {
    if (e) {
      if ("string" == typeof e) return _arrayLikeToArray(e, t);var r = Object.prototype.toString.call(e).slice(8, -1);return "Object" === r && e.constructor && (r = e.constructor.name), "Map" === r || "Set" === r ? Array.from(e) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? _arrayLikeToArray(e, t) : void 0;
    }
  }function _arrayLikeToArray(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var r = 0, n = new Array(t); r < t; r++) {
      n[r] = e[r];
    }return n;
  }var e = function TypesonPromise(e) {
    _classCallCheck(this, TypesonPromise), this.p = new Promise(e);
  };e.__typeson__type__ = "TypesonPromise", "undefined" != typeof Symbol && (e.prototype[Symbol.toStringTag] = "TypesonPromise"), e.prototype.then = function (t, r) {
    var n = this;return new e(function (e, i) {
      n.p.then(function (r) {
        e(t ? t(r) : r);
      }).catch(function (e) {
        return r ? r(e) : Promise.reject(e);
      }).then(e, i);
    });
  }, e.prototype.catch = function (e) {
    return this.then(null, e);
  }, e.resolve = function (t) {
    return new e(function (e) {
      e(t);
    });
  }, e.reject = function (t) {
    return new e(function (e, r) {
      r(t);
    });
  }, ["all", "race"].forEach(function (t) {
    e[t] = function (r) {
      return new e(function (e, n) {
        Promise[t](r.map(function (e) {
          return e && e.constructor && "TypesonPromise" === e.constructor.__typeson__type__ ? e.p : e;
        })).then(e, n);
      });
    };
  });var t = {}.toString,
      r = {}.hasOwnProperty,
      n = Object.getPrototypeOf,
      i = r.toString;function isThenable(e, t) {
    return isObject(e) && "function" == typeof e.then && (!t || "function" == typeof e.catch);
  }function toStringTag(e) {
    return t.call(e).slice(8, -1);
  }function hasConstructorOf(e, t) {
    if (!e || "object" !== _typeof(e)) return !1;var o = n(e);if (!o) return null === t;var a = r.call(o, "constructor") && o.constructor;return "function" != typeof a ? null === t : t === a || null !== t && i.call(a) === i.call(t) || "function" == typeof t && "string" == typeof a.__typeson__type__ && a.__typeson__type__ === t.__typeson__type__;
  }function isPlainObject(e) {
    return !(!e || "Object" !== toStringTag(e)) && (!n(e) || hasConstructorOf(e, Object));
  }function isObject(e) {
    return e && "object" === _typeof(e);
  }function escapeKeyPathComponent(e) {
    return e.replace(/~/g, "~0").replace(/\./g, "~1");
  }function unescapeKeyPathComponent(e) {
    return e.replace(/~1/g, ".").replace(/~0/g, "~");
  }function getByKeyPath(e, t) {
    if ("" === t) return e;var r = t.indexOf(".");if (r > -1) {
      var n = e[unescapeKeyPathComponent(t.slice(0, r))];return void 0 === n ? void 0 : getByKeyPath(n, t.slice(r + 1));
    }return e[unescapeKeyPathComponent(t)];
  }function setAtKeyPath(e, t, r) {
    if ("" === t) return r;var n = t.indexOf(".");return n > -1 ? setAtKeyPath(e[unescapeKeyPathComponent(t.slice(0, n))], t.slice(n + 1), r) : (e[unescapeKeyPathComponent(t)] = r, e);
  }function _await(e, t, r) {
    return r ? t ? t(e) : e : (e && e.then || (e = Promise.resolve(e)), t ? e.then(t) : e);
  }var o = Object.keys,
      a = Array.isArray,
      c = {}.hasOwnProperty,
      u = ["type", "replaced", "iterateIn", "iterateUnsetNumeric"];function _async(e) {
    return function () {
      for (var t = [], r = 0; r < arguments.length; r++) {
        t[r] = arguments[r];
      }try {
        return Promise.resolve(e.apply(this, t));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }function nestedPathsFirst(e, t) {
    if ("" === e.keypath) return -1;var r = e.keypath.match(/\./g) || 0,
        n = t.keypath.match(/\./g) || 0;return r && (r = r.length), n && (n = n.length), r > n ? -1 : r < n ? 1 : e.keypath < t.keypath ? -1 : e.keypath > t.keypath;
  }var s = function () {
    function Typeson(e) {
      _classCallCheck(this, Typeson), this.options = e, this.plainObjectReplacers = [], this.nonplainObjectReplacers = [], this.revivers = {}, this.types = {};
    }return function _createClass(e, t, r) {
      return t && _defineProperties(e.prototype, t), r && _defineProperties(e, r), e;
    }(Typeson, [{ key: "stringify", value: function stringify(e, t, r, n) {
        n = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), n), {}, { stringification: !0 });var i = this.encapsulate(e, null, n);return a(i) ? JSON.stringify(i[0], t, r) : i.then(function (e) {
          return JSON.stringify(e, t, r);
        });
      } }, { key: "stringifySync", value: function stringifySync(e, t, r, n) {
        return this.stringify(e, t, r, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, n), {}, { sync: !0 }));
      } }, { key: "stringifyAsync", value: function stringifyAsync(e, t, r, n) {
        return this.stringify(e, t, r, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, n), {}, { sync: !1 }));
      } }, { key: "parse", value: function parse(e, t, r) {
        return r = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), r), {}, { parse: !0 }), this.revive(JSON.parse(e, t), r);
      } }, { key: "parseSync", value: function parseSync(e, t, r) {
        return this.parse(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !0 }));
      } }, { key: "parseAsync", value: function parseAsync(e, t, r) {
        return this.parse(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !1 }));
      } }, { key: "specialTypeNames", value: function specialTypeNames(e, t) {
        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};return r.returnTypeNames = !0, this.encapsulate(e, t, r);
      } }, { key: "rootTypeName", value: function rootTypeName(e, t) {
        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};return r.iterateNone = !0, this.encapsulate(e, t, r);
      } }, { key: "encapsulate", value: function encapsulate(t, r, n) {
        var i = _async(function (t, r) {
          return _await(Promise.all(r.map(function (e) {
            return e[1].p;
          })), function (n) {
            return _await(Promise.all(n.map(_async(function (n) {
              var o = !1,
                  a = [],
                  c = _slicedToArray(r.splice(0, 1), 1),
                  u = _slicedToArray(c[0], 7),
                  s = u[0],
                  f = u[2],
                  l = u[3],
                  p = u[4],
                  y = u[5],
                  v = u[6],
                  b = _encapsulate(s, n, f, l, a, !0, v),
                  d = hasConstructorOf(b, e);return function _invoke(e, t) {
                var r = e();return r && r.then ? r.then(t) : t(r);
              }(function () {
                if (s && d) return _await(b.p, function (e) {
                  return p[y] = e, o = !0, i(t, a);
                });
              }, function (e) {
                return o ? e : (s ? p[y] = b : t = d ? b.p : b, i(t, a));
              });
            }))), function () {
              return t;
            });
          });
        }),
            s = (n = _objectSpread2(_objectSpread2({ sync: !0 }, this.options), n)).sync,
            f = this,
            l = {},
            p = [],
            y = [],
            v = [],
            b = !("cyclic" in n) || n.cyclic,
            d = n.encapsulateObserver,
            h = _encapsulate("", t, b, r || {}, v);function finish(e) {
          var t = Object.values(l);if (n.iterateNone) return t.length ? t[0] : Typeson.getJSONType(e);if (t.length) {
            if (n.returnTypeNames) return _toConsumableArray(new Set(t));e && isPlainObject(e) && !c.call(e, "$types") ? e.$types = l : e = { $: e, $types: { $: l } };
          } else isObject(e) && c.call(e, "$types") && (e = { $: e, $types: !0 });return !n.returnTypeNames && e;
        }function _adaptBuiltinStateObjectProperties(e, t, r) {
          Object.assign(e, t);var n = u.map(function (t) {
            var r = e[t];return delete e[t], r;
          });r(), u.forEach(function (t, r) {
            e[t] = n[r];
          });
        }function _encapsulate(t, r, i, u, s, v, b) {
          var h,
              g = {},
              m = _typeof(r),
              O = d ? function (n) {
            var o = b || u.type || Typeson.getJSONType(r);d(Object.assign(n || g, { keypath: t, value: r, cyclic: i, stateObj: u, promisesData: s, resolvingTypesonPromise: v, awaitingTypesonPromise: hasConstructorOf(r, e) }, { type: o }));
          } : null;if (["string", "boolean", "number", "undefined"].includes(m)) return void 0 === r || Number.isNaN(r) || r === Number.NEGATIVE_INFINITY || r === Number.POSITIVE_INFINITY ? (h = u.replaced ? r : replace(t, r, u, s, !1, v, O)) !== r && (g = { replaced: h }) : h = r, O && O(), h;if (null === r) return O && O(), r;if (i && !u.iterateIn && !u.iterateUnsetNumeric && r && "object" === _typeof(r)) {
            var _ = p.indexOf(r);if (!(_ < 0)) return l[t] = "#", O && O({ cyclicKeypath: y[_] }), "#" + y[_];!0 === i && (p.push(r), y.push(t));
          }var j,
              S = isPlainObject(r),
              T = a(r),
              w = (S || T) && (!f.plainObjectReplacers.length || u.replaced) || u.iterateIn ? r : replace(t, r, u, s, S || T, null, O);if (w !== r ? (h = w, g = { replaced: w }) : "" === t && hasConstructorOf(r, e) ? (s.push([t, r, i, u, void 0, void 0, u.type]), h = r) : T && "object" !== u.iterateIn || "array" === u.iterateIn ? (j = new Array(r.length), g = { clone: j }) : (["function", "symbol"].includes(_typeof(r)) || "toJSON" in r || hasConstructorOf(r, e) || hasConstructorOf(r, Promise) || hasConstructorOf(r, ArrayBuffer)) && !S && "object" !== u.iterateIn ? h = r : (j = {}, u.addLength && (j.length = r.length), g = { clone: j }), O && O(), n.iterateNone) return j || h;if (!j) return h;if (u.iterateIn) {
            var A = function _loop(n) {
              var o = { ownKeys: c.call(r, n) };_adaptBuiltinStateObjectProperties(u, o, function () {
                var o = t + (t ? "." : "") + escapeKeyPathComponent(n),
                    a = _encapsulate(o, r[n], Boolean(i), u, s, v);hasConstructorOf(a, e) ? s.push([o, a, Boolean(i), u, j, n, u.type]) : void 0 !== a && (j[n] = a);
              });
            };for (var P in r) {
              A(P);
            }O && O({ endIterateIn: !0, end: !0 });
          } else o(r).forEach(function (n) {
            var o = t + (t ? "." : "") + escapeKeyPathComponent(n);_adaptBuiltinStateObjectProperties(u, { ownKeys: !0 }, function () {
              var t = _encapsulate(o, r[n], Boolean(i), u, s, v);hasConstructorOf(t, e) ? s.push([o, t, Boolean(i), u, j, n, u.type]) : void 0 !== t && (j[n] = t);
            });
          }), O && O({ endIterateOwn: !0, end: !0 });if (u.iterateUnsetNumeric) {
            for (var C = r.length, I = function _loop2(n) {
              if (!(n in r)) {
                var o = t + (t ? "." : "") + n;_adaptBuiltinStateObjectProperties(u, { ownKeys: !1 }, function () {
                  var t = _encapsulate(o, void 0, Boolean(i), u, s, v);hasConstructorOf(t, e) ? s.push([o, t, Boolean(i), u, j, n, u.type]) : void 0 !== t && (j[n] = t);
                });
              }
            }, N = 0; N < C; N++) {
              I(N);
            }O && O({ endIterateUnsetNumeric: !0, end: !0 });
          }return j;
        }function replace(e, t, r, n, i, o, a) {
          for (var c = i ? f.plainObjectReplacers : f.nonplainObjectReplacers, u = c.length; u--;) {
            var p = c[u];if (p.test(t, r)) {
              var y = p.type;if (f.revivers[y]) {
                var v = l[e];l[e] = v ? [y].concat(v) : y;
              }return Object.assign(r, { type: y, replaced: !0 }), !s && p.replaceAsync || p.replace ? (a && a({ replacing: !0 }), _encapsulate(e, p[s || !p.replaceAsync ? "replace" : "replaceAsync"](t, r), b && "readonly", r, n, o, y)) : (a && a({ typeDetected: !0 }), _encapsulate(e, t, b && "readonly", r, n, o, y));
            }
          }return t;
        }return v.length ? s && n.throwOnBadSyncType ? function () {
          throw new TypeError("Sync method requested but async result obtained");
        }() : Promise.resolve(i(h, v)).then(finish) : !s && n.throwOnBadSyncType ? function () {
          throw new TypeError("Async method requested but sync result obtained");
        }() : n.stringification && s ? [finish(h)] : s ? finish(h) : Promise.resolve(finish(h));
      } }, { key: "encapsulateSync", value: function encapsulateSync(e, t, r) {
        return this.encapsulate(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !0 }));
      } }, { key: "encapsulateAsync", value: function encapsulateAsync(e, t, r) {
        return this.encapsulate(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !1 }));
      } }, { key: "revive", value: function revive(t, r) {
        var n = t && t.$types;if (!n) return t;if (!0 === n) return t.$;var i = (r = _objectSpread2(_objectSpread2({ sync: !0 }, this.options), r)).sync,
            c = [],
            u = {},
            s = !0;n.$ && isPlainObject(n.$) && (t = t.$, n = n.$, s = !1);var l = this;function executeReviver(e, t) {
          var r = _slicedToArray(l.revivers[e] || [], 1)[0];if (!r) throw new Error("Unregistered type: " + e);return i && !("revive" in r) ? t : r[i && r.revive ? "revive" : !i && r.reviveAsync ? "reviveAsync" : "revive"](t, u);
        }var p = [];function checkUndefined(e) {
          return hasConstructorOf(e, f) ? void 0 : e;
        }var y,
            v = function revivePlainObjects() {
          var r = [];if (Object.entries(n).forEach(function (e) {
            var t = _slicedToArray(e, 2),
                i = t[0],
                o = t[1];"#" !== o && [].concat(o).forEach(function (e) {
              _slicedToArray(l.revivers[e] || [null, {}], 2)[1].plain && (r.push({ keypath: i, type: e }), delete n[i]);
            });
          }), r.length) return r.sort(nestedPathsFirst).reduce(function reducer(r, n) {
            var i = n.keypath,
                o = n.type;if (isThenable(r)) return r.then(function (e) {
              return reducer(e, { keypath: i, type: o });
            });var a = getByKeyPath(t, i);if (hasConstructorOf(a = executeReviver(o, a), e)) return a.then(function (e) {
              var r = setAtKeyPath(t, i, e);r === e && (t = r);
            });var c = setAtKeyPath(t, i, a);c === a && (t = c);
          }, void 0);
        }();return hasConstructorOf(v, e) ? y = v.then(function () {
          return t;
        }) : (y = function _revive(t, r, i, u, l) {
          if (!s || "$types" !== t) {
            var y = n[t],
                v = a(r);if (v || isPlainObject(r)) {
              var b = v ? new Array(r.length) : {};for (o(r).forEach(function (n) {
                var o = _revive(t + (t ? "." : "") + escapeKeyPathComponent(n), r[n], i || b, b, n),
                    a = function set(e) {
                  return hasConstructorOf(e, f) ? b[n] = void 0 : void 0 !== e && (b[n] = e), e;
                };hasConstructorOf(o, e) ? p.push(o.then(function (e) {
                  return a(e);
                })) : a(o);
              }), r = b; c.length;) {
                var d = _slicedToArray(c[0], 4),
                    h = d[0],
                    g = d[1],
                    m = d[2],
                    O = d[3],
                    _ = getByKeyPath(h, g);if (void 0 === _) break;m[O] = _, c.splice(0, 1);
              }
            }if (!y) return r;if ("#" === y) {
              var j = getByKeyPath(i, r.slice(1));return void 0 === j && c.push([i, r.slice(1), u, l]), j;
            }return [].concat(y).reduce(function reducer(t, r) {
              return hasConstructorOf(t, e) ? t.then(function (e) {
                return reducer(e, r);
              }) : executeReviver(r, t);
            }, r);
          }
        }("", t, null), p.length && (y = e.resolve(y).then(function (t) {
          return e.all([t].concat(p));
        }).then(function (e) {
          return _slicedToArray(e, 1)[0];
        }))), isThenable(y) ? i && r.throwOnBadSyncType ? function () {
          throw new TypeError("Sync method requested but async result obtained");
        }() : hasConstructorOf(y, e) ? y.p.then(checkUndefined) : y : !i && r.throwOnBadSyncType ? function () {
          throw new TypeError("Async method requested but sync result obtained");
        }() : i ? checkUndefined(y) : Promise.resolve(checkUndefined(y));
      } }, { key: "reviveSync", value: function reviveSync(e, t) {
        return this.revive(e, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, t), {}, { sync: !0 }));
      } }, { key: "reviveAsync", value: function reviveAsync(e, t) {
        return this.revive(e, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, t), {}, { sync: !1 }));
      } }, { key: "register", value: function register(e, t) {
        return t = t || {}, [].concat(e).forEach(function R(e) {
          var r = this;if (a(e)) return e.map(function (e) {
            return R.call(r, e);
          });e && o(e).forEach(function (r) {
            if ("#" === r) throw new TypeError("# cannot be used as a type name as it is reserved for cyclic objects");if (Typeson.JSON_TYPES.includes(r)) throw new TypeError("Plain JSON object types are reserved as type names");var n = e[r],
                i = n && n.testPlainObjects ? this.plainObjectReplacers : this.nonplainObjectReplacers,
                o = i.filter(function (e) {
              return e.type === r;
            });if (o.length && (i.splice(i.indexOf(o[0]), 1), delete this.revivers[r], delete this.types[r]), "function" == typeof n) {
              var c = n;n = { test: function test(e) {
                  return e && e.constructor === c;
                }, replace: function replace(e) {
                  return _objectSpread2({}, e);
                }, revive: function revive(e) {
                  return Object.assign(Object.create(c.prototype), e);
                } };
            } else if (a(n)) {
              var u = _slicedToArray(n, 3);n = { test: u[0], replace: u[1], revive: u[2] };
            }if (n && n.test) {
              var s = { type: r, test: n.test.bind(n) };n.replace && (s.replace = n.replace.bind(n)), n.replaceAsync && (s.replaceAsync = n.replaceAsync.bind(n));var f = "number" == typeof t.fallback ? t.fallback : t.fallback ? 0 : Number.POSITIVE_INFINITY;if (n.testPlainObjects ? this.plainObjectReplacers.splice(f, 0, s) : this.nonplainObjectReplacers.splice(f, 0, s), n.revive || n.reviveAsync) {
                var l = {};n.revive && (l.revive = n.revive.bind(n)), n.reviveAsync && (l.reviveAsync = n.reviveAsync.bind(n)), this.revivers[r] = [l, { plain: n.testPlainObjects }];
              }this.types[r] = n;
            }
          }, this);
        }, this), this;
      } }]), Typeson;
  }(),
      f = function Undefined() {
    _classCallCheck(this, Undefined);
  };f.__typeson__type__ = "TypesonUndefined", s.Undefined = f, s.Promise = e, s.isThenable = isThenable, s.toStringTag = toStringTag, s.hasConstructorOf = hasConstructorOf, s.isObject = isObject, s.isPlainObject = isPlainObject, s.isUserObject = function isUserObject(e) {
    if (!e || "Object" !== toStringTag(e)) return !1;var t = n(e);return !t || hasConstructorOf(e, Object) || isUserObject(t);
  }, s.escapeKeyPathComponent = escapeKeyPathComponent, s.unescapeKeyPathComponent = unescapeKeyPathComponent, s.getByKeyPath = getByKeyPath, s.getJSONType = function getJSONType(e) {
    return null === e ? "null" : Array.isArray(e) ? "array" : _typeof(e);
  }, s.JSON_TYPES = ["null", "boolean", "number", "string", "array", "object"];for (var l = { userObject: { test: function test(e, t) {
        return s.isUserObject(e);
      }, replace: function replace(e) {
        return function _objectSpread2$1(e) {
          for (var t = 1; t < arguments.length; t++) {
            var r = null != arguments[t] ? arguments[t] : {};t % 2 ? ownKeys$1(Object(r), !0).forEach(function (t) {
              _defineProperty$1(e, t, r[t]);
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : ownKeys$1(Object(r)).forEach(function (t) {
              Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
            });
          }return e;
        }({}, e);
      }, revive: function revive(e) {
        return e;
      } } }, p = [{ arrayNonindexKeys: { testPlainObjects: !0, test: function test(e, t) {
        return !!Array.isArray(e) && (Object.keys(e).some(function (e) {
          return String(Number.parseInt(e)) !== e;
        }) && (t.iterateIn = "object", t.addLength = !0), !0);
      }, replace: function replace(e, t) {
        return t.iterateUnsetNumeric = !0, e;
      }, revive: function revive(e) {
        if (Array.isArray(e)) return e;var t = [];return Object.keys(e).forEach(function (r) {
          var n = e[r];t[r] = n;
        }), t;
      } } }, { sparseUndefined: { test: function test(e, t) {
        return void 0 === e && !1 === t.ownKeys;
      }, replace: function replace(e) {
        return 0;
      }, revive: function revive(e) {} } }], y = { undef: { test: function test(e, t) {
        return void 0 === e && (t.ownKeys || !("ownKeys" in t));
      }, replace: function replace(e) {
        return 0;
      }, revive: function revive(e) {
        return new s.Undefined();
      } } }, v = { StringObject: { test: function test(e) {
        return "String" === s.toStringTag(e) && "object" === _typeof$1(e);
      }, replace: function replace(e) {
        return String(e);
      }, revive: function revive(e) {
        return new String(e);
      } }, BooleanObject: { test: function test(e) {
        return "Boolean" === s.toStringTag(e) && "object" === _typeof$1(e);
      }, replace: function replace(e) {
        return Boolean(e);
      }, revive: function revive(e) {
        return new Boolean(e);
      } }, NumberObject: { test: function test(e) {
        return "Number" === s.toStringTag(e) && "object" === _typeof$1(e);
      }, replace: function replace(e) {
        return Number(e);
      }, revive: function revive(e) {
        return new Number(e);
      } } }, b = [{ nan: { test: function test(e) {
        return Number.isNaN(e);
      }, replace: function replace(e) {
        return "NaN";
      }, revive: function revive(e) {
        return Number.NaN;
      } } }, { infinity: { test: function test(e) {
        return e === Number.POSITIVE_INFINITY;
      }, replace: function replace(e) {
        return "Infinity";
      }, revive: function revive(e) {
        return Number.POSITIVE_INFINITY;
      } } }, { negativeInfinity: { test: function test(e) {
        return e === Number.NEGATIVE_INFINITY;
      }, replace: function replace(e) {
        return "-Infinity";
      }, revive: function revive(e) {
        return Number.NEGATIVE_INFINITY;
      } } }], d = { date: { test: function test(e) {
        return "Date" === s.toStringTag(e);
      }, replace: function replace(e) {
        var t = e.getTime();return Number.isNaN(t) ? "NaN" : t;
      }, revive: function revive(e) {
        return "NaN" === e ? new Date(Number.NaN) : new Date(e);
      } } }, h = { regexp: { test: function test(e) {
        return "RegExp" === s.toStringTag(e);
      }, replace: function replace(e) {
        return { source: e.source, flags: (e.global ? "g" : "") + (e.ignoreCase ? "i" : "") + (e.multiline ? "m" : "") + (e.sticky ? "y" : "") + (e.unicode ? "u" : "") };
      }, revive: function revive(e) {
        var t = e.source,
            r = e.flags;return new RegExp(t, r);
      } } }, g = { map: { test: function test(e) {
        return "Map" === s.toStringTag(e);
      }, replace: function replace(e) {
        return _toConsumableArray$1(e.entries());
      }, revive: function revive(e) {
        return new Map(e);
      } } }, m = { set: { test: function test(e) {
        return "Set" === s.toStringTag(e);
      }, replace: function replace(e) {
        return _toConsumableArray$1(e.values());
      }, revive: function revive(e) {
        return new Set(e);
      } } }, O = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", _ = new Uint8Array(256), j = 0; j < O.length; j++) {
    _[O.charCodeAt(j)] = j;
  }var S = function encode(e, t, r) {
    null == r && (r = e.byteLength);for (var n = new Uint8Array(e, t || 0, r), i = n.length, o = "", a = 0; a < i; a += 3) {
      o += O[n[a] >> 2], o += O[(3 & n[a]) << 4 | n[a + 1] >> 4], o += O[(15 & n[a + 1]) << 2 | n[a + 2] >> 6], o += O[63 & n[a + 2]];
    }return i % 3 == 2 ? o = o.slice(0, -1) + "=" : i % 3 == 1 && (o = o.slice(0, -2) + "=="), o;
  },
      T = function decode(e) {
    var t,
        r,
        n,
        i,
        o = e.length,
        a = .75 * e.length,
        c = 0;"=" === e[e.length - 1] && (a--, "=" === e[e.length - 2] && a--);for (var u = new ArrayBuffer(a), s = new Uint8Array(u), f = 0; f < o; f += 4) {
      t = _[e.charCodeAt(f)], r = _[e.charCodeAt(f + 1)], n = _[e.charCodeAt(f + 2)], i = _[e.charCodeAt(f + 3)], s[c++] = t << 2 | r >> 4, s[c++] = (15 & r) << 4 | n >> 2, s[c++] = (3 & n) << 6 | 63 & i;
    }return u;
  },
      w = { arraybuffer: { test: function test(e) {
        return "ArrayBuffer" === s.toStringTag(e);
      }, replace: function replace(e, t) {
        t.buffers || (t.buffers = []);var r = t.buffers.indexOf(e);return r > -1 ? { index: r } : (t.buffers.push(e), S(e));
      }, revive: function revive(e, t) {
        if (t.buffers || (t.buffers = []), "object" === _typeof$1(e)) return t.buffers[e.index];var r = T(e);return t.buffers.push(r), r;
      } } },
      A = "undefined" == typeof self ? global : self,
      P = {};["Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array"].forEach(function (e) {
    var t = e,
        r = A[t];r && (P[e.toLowerCase()] = { test: function test(e) {
        return s.toStringTag(e) === t;
      }, replace: function replace(e, t) {
        var r = e.buffer,
            n = e.byteOffset,
            i = e.length;t.buffers || (t.buffers = []);var o = t.buffers.indexOf(r);return o > -1 ? { index: o, byteOffset: n, length: i } : (t.buffers.push(r), { encoded: S(r), byteOffset: n, length: i });
      }, revive: function revive(e, t) {
        t.buffers || (t.buffers = []);var n,
            i = e.byteOffset,
            o = e.length,
            a = e.encoded,
            c = e.index;return "index" in e ? n = t.buffers[c] : (n = T(a), t.buffers.push(n)), new r(n, i, o);
      } });
  });var C = { dataview: { test: function test(e) {
        return "DataView" === s.toStringTag(e);
      }, replace: function replace(e, t) {
        var r = e.buffer,
            n = e.byteOffset,
            i = e.byteLength;t.buffers || (t.buffers = []);var o = t.buffers.indexOf(r);return o > -1 ? { index: o, byteOffset: n, byteLength: i } : (t.buffers.push(r), { encoded: S(r), byteOffset: n, byteLength: i });
      }, revive: function revive(e, t) {
        t.buffers || (t.buffers = []);var r,
            n = e.byteOffset,
            i = e.byteLength,
            o = e.encoded,
            a = e.index;return "index" in e ? r = t.buffers[a] : (r = T(o), t.buffers.push(r)), new DataView(r, n, i);
      } } },
      I = { IntlCollator: { test: function test(e) {
        return s.hasConstructorOf(e, Intl.Collator);
      }, replace: function replace(e) {
        return e.resolvedOptions();
      }, revive: function revive(e) {
        return new Intl.Collator(e.locale, e);
      } }, IntlDateTimeFormat: { test: function test(e) {
        return s.hasConstructorOf(e, Intl.DateTimeFormat);
      }, replace: function replace(e) {
        return e.resolvedOptions();
      }, revive: function revive(e) {
        return new Intl.DateTimeFormat(e.locale, e);
      } }, IntlNumberFormat: { test: function test(e) {
        return s.hasConstructorOf(e, Intl.NumberFormat);
      }, replace: function replace(e) {
        return e.resolvedOptions();
      }, revive: function revive(e) {
        return new Intl.NumberFormat(e.locale, e);
      } } };function string2arraybuffer(e) {
    for (var t = new Uint8Array(e.length), r = 0; r < e.length; r++) {
      t[r] = e.charCodeAt(r);
    }return t.buffer;
  }var N = { file: { test: function test(e) {
        return "File" === s.toStringTag(e);
      }, replace: function replace(e) {
        var t = new XMLHttpRequest();if (t.overrideMimeType("text/plain; charset=x-user-defined"), t.open("GET", URL.createObjectURL(e), !1), t.send(), 200 !== t.status && 0 !== t.status) throw new Error("Bad File access: " + t.status);return { type: e.type, stringContents: t.responseText, name: e.name, lastModified: e.lastModified };
      }, revive: function revive(e) {
        var t = e.name,
            r = e.type,
            n = e.stringContents,
            i = e.lastModified;return new File([string2arraybuffer(n)], t, { type: r, lastModified: i });
      }, replaceAsync: function replaceAsync(e) {
        return new s.Promise(function (t, r) {
          var n = new FileReader();n.addEventListener("load", function () {
            t({ type: e.type, stringContents: n.result, name: e.name, lastModified: e.lastModified });
          }), n.addEventListener("error", function () {
            r(n.error);
          }), n.readAsBinaryString(e);
        });
      } } },
      k = { bigint: { test: function test(e) {
        return "bigint" == typeof e;
      }, replace: function replace(e) {
        return String(e);
      }, revive: function revive(e) {
        return BigInt(e);
      } } },
      E = { bigintObject: { test: function test(e) {
        return "object" === _typeof$1(e) && s.hasConstructorOf(e, BigInt);
      }, replace: function replace(e) {
        return String(e);
      }, revive: function revive(e) {
        return new Object(BigInt(e));
      } } },
      B = { cryptokey: { test: function test(e) {
        return "CryptoKey" === s.toStringTag(e) && e.extractable;
      }, replaceAsync: function replaceAsync(e) {
        return new s.Promise(function (t, r) {
          crypto.subtle.exportKey("jwk", e).catch(function (e) {
            r(e);
          }).then(function (r) {
            t({ jwk: r, algorithm: e.algorithm, usages: e.usages });
          });
        });
      }, revive: function revive(e) {
        var t = e.jwk,
            r = e.algorithm,
            n = e.usages;return crypto.subtle.importKey("jwk", t, r, !0, n);
      } } };return [l, y, p, v, b, d, h, { imagedata: { test: function test(e) {
        return "ImageData" === s.toStringTag(e);
      }, replace: function replace(e) {
        return { array: _toConsumableArray$1(e.data), width: e.width, height: e.height };
      }, revive: function revive(e) {
        return new ImageData(new Uint8ClampedArray(e.array), e.width, e.height);
      } } }, { imagebitmap: { test: function test(e) {
        return "ImageBitmap" === s.toStringTag(e) || e && e.dataset && "ImageBitmap" === e.dataset.toStringTag;
      }, replace: function replace(e) {
        var t = document.createElement("canvas");return t.getContext("2d").drawImage(e, 0, 0), t.toDataURL();
      }, revive: function revive(e) {
        var t = document.createElement("canvas"),
            r = t.getContext("2d"),
            n = document.createElement("img");return n.addEventListener("load", function () {
          r.drawImage(n, 0, 0);
        }), n.src = e, t;
      }, reviveAsync: function reviveAsync(e) {
        var t = document.createElement("canvas"),
            r = t.getContext("2d"),
            n = document.createElement("img");return n.addEventListener("load", function () {
          r.drawImage(n, 0, 0);
        }), n.src = e, createImageBitmap(t);
      } } }, N, { file: N.file, filelist: { test: function test(e) {
        return "FileList" === s.toStringTag(e);
      }, replace: function replace(e) {
        for (var t = [], r = 0; r < e.length; r++) {
          t[r] = e.item(r);
        }return t;
      }, revive: function revive(e) {
        return new (function () {
          function FileList() {
            _classCallCheck$1(this, FileList), this._files = arguments[0], this.length = this._files.length;
          }return function _createClass$1(e, t, r) {
            return t && _defineProperties$1(e.prototype, t), r && _defineProperties$1(e, r), e;
          }(FileList, [{ key: "item", value: function item(e) {
              return this._files[e];
            } }, { key: Symbol.toStringTag, get: function get() {
              return "FileList";
            } }]), FileList;
        }())(e);
      } } }, { blob: { test: function test(e) {
        return "Blob" === s.toStringTag(e);
      }, replace: function replace(e) {
        var t = new XMLHttpRequest();if (t.overrideMimeType("text/plain; charset=x-user-defined"), t.open("GET", URL.createObjectURL(e), !1), t.send(), 200 !== t.status && 0 !== t.status) throw new Error("Bad Blob access: " + t.status);return { type: e.type, stringContents: t.responseText };
      }, revive: function revive(e) {
        var t = e.type,
            r = e.stringContents;return new Blob([string2arraybuffer(r)], { type: t });
      }, replaceAsync: function replaceAsync(e) {
        return new s.Promise(function (t, r) {
          var n = new FileReader();n.addEventListener("load", function () {
            t({ type: e.type, stringContents: n.result });
          }), n.addEventListener("error", function () {
            r(n.error);
          }), n.readAsBinaryString(e);
        });
      } } }].concat("function" == typeof Map ? g : [], "function" == typeof Set ? m : [], "function" == typeof ArrayBuffer ? w : [], "function" == typeof Uint8Array ? P : [], "function" == typeof DataView ? C : [], "undefined" != typeof Intl ? I : [], "undefined" != typeof crypto ? B : [], "undefined" != typeof BigInt ? [k, E] : []).concat({ checkDataCloneException: { test: function test(e) {
        var t = {}.toString.call(e).slice(8, -1);if (["symbol", "function"].includes(_typeof$1(e)) || ["Arguments", "Module", "Error", "Promise", "WeakMap", "WeakSet", "Event", "MessageChannel"].includes(t) || e && "object" === _typeof$1(e) && "number" == typeof e.nodeType && "function" == typeof e.insertBefore) throw new DOMException("The object cannot be cloned.", "DataCloneError");return !1;
      } } });
});


},{}],8:[function(_dereq_,module,exports){
"use strict";

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _typeof(e) {
  return (_typeof = "function" == typeof Symbol && "symbol" == _typeof2(Symbol.iterator) ? function (e) {
    return typeof e === "undefined" ? "undefined" : _typeof2(e);
  } : function (e) {
    return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : _typeof2(e);
  })(e);
}function _classCallCheck(e, t) {
  if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}function _defineProperties(e, t) {
  for (var r = 0; r < t.length; r++) {
    var n = t[r];n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n);
  }
}function _defineProperty(e, t, r) {
  return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}function ownKeys(e, t) {
  var r = Object.keys(e);if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);t && (n = n.filter(function (t) {
      return Object.getOwnPropertyDescriptor(e, t).enumerable;
    })), r.push.apply(r, n);
  }return r;
}function _objectSpread2(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = null != arguments[t] ? arguments[t] : {};t % 2 ? ownKeys(Object(r), !0).forEach(function (t) {
      _defineProperty(e, t, r[t]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : ownKeys(Object(r)).forEach(function (t) {
      Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
    });
  }return e;
}function _slicedToArray(e, t) {
  return function _arrayWithHoles(e) {
    if (Array.isArray(e)) return e;
  }(e) || function _iterableToArrayLimit(e, t) {
    if ("undefined" == typeof Symbol || !(Symbol.iterator in Object(e))) return;var r = [],
        n = !0,
        o = !1,
        a = void 0;try {
      for (var i, c = e[Symbol.iterator](); !(n = (i = c.next()).done) && (r.push(i.value), !t || r.length !== t); n = !0) {}
    } catch (e) {
      o = !0, a = e;
    } finally {
      try {
        n || null == c.return || c.return();
      } finally {
        if (o) throw a;
      }
    }return r;
  }(e, t) || _unsupportedIterableToArray(e, t) || function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }();
}function _toConsumableArray(e) {
  return function _arrayWithoutHoles(e) {
    if (Array.isArray(e)) return _arrayLikeToArray(e);
  }(e) || function _iterableToArray(e) {
    if ("undefined" != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
  }(e) || _unsupportedIterableToArray(e) || function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }();
}function _unsupportedIterableToArray(e, t) {
  if (e) {
    if ("string" == typeof e) return _arrayLikeToArray(e, t);var r = Object.prototype.toString.call(e).slice(8, -1);return "Object" === r && e.constructor && (r = e.constructor.name), "Map" === r || "Set" === r ? Array.from(e) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? _arrayLikeToArray(e, t) : void 0;
  }
}function _arrayLikeToArray(e, t) {
  (null == t || t > e.length) && (t = e.length);for (var r = 0, n = new Array(t); r < t; r++) {
    n[r] = e[r];
  }return n;
}var e = function TypesonPromise(e) {
  _classCallCheck(this, TypesonPromise), this.p = new Promise(e);
};e.__typeson__type__ = "TypesonPromise", "undefined" != typeof Symbol && (e.prototype[Symbol.toStringTag] = "TypesonPromise"), e.prototype.then = function (t, r) {
  var n = this;return new e(function (e, o) {
    n.p.then(function (r) {
      e(t ? t(r) : r);
    }).catch(function (e) {
      return r ? r(e) : Promise.reject(e);
    }).then(e, o);
  });
}, e.prototype.catch = function (e) {
  return this.then(null, e);
}, e.resolve = function (t) {
  return new e(function (e) {
    e(t);
  });
}, e.reject = function (t) {
  return new e(function (e, r) {
    r(t);
  });
}, ["all", "race", "allSettled"].forEach(function (t) {
  e[t] = function (r) {
    return new e(function (e, n) {
      Promise[t](r.map(function (e) {
        return e && e.constructor && "TypesonPromise" === e.constructor.__typeson__type__ ? e.p : e;
      })).then(e, n);
    });
  };
});var t = {}.toString,
    r = {}.hasOwnProperty,
    n = Object.getPrototypeOf,
    o = r.toString;function isThenable(e, t) {
  return isObject(e) && "function" == typeof e.then && (!t || "function" == typeof e.catch);
}function toStringTag(e) {
  return t.call(e).slice(8, -1);
}function hasConstructorOf(e, t) {
  if (!e || "object" !== _typeof(e)) return !1;var a = n(e);if (!a) return null === t;var i = r.call(a, "constructor") && a.constructor;return "function" != typeof i ? null === t : t === i || null !== t && o.call(i) === o.call(t) || "function" == typeof t && "string" == typeof i.__typeson__type__ && i.__typeson__type__ === t.__typeson__type__;
}function isPlainObject(e) {
  return !(!e || "Object" !== toStringTag(e)) && (!n(e) || hasConstructorOf(e, Object));
}function isObject(e) {
  return e && "object" === _typeof(e);
}function escapeKeyPathComponent(e) {
  return e.replace(/~/g, "~0").replace(/\./g, "~1");
}function unescapeKeyPathComponent(e) {
  return e.replace(/~1/g, ".").replace(/~0/g, "~");
}function getByKeyPath(e, t) {
  if ("" === t) return e;var r = t.indexOf(".");if (r > -1) {
    var n = e[unescapeKeyPathComponent(t.slice(0, r))];return void 0 === n ? void 0 : getByKeyPath(n, t.slice(r + 1));
  }return e[unescapeKeyPathComponent(t)];
}function setAtKeyPath(e, t, r) {
  if ("" === t) return r;var n = t.indexOf(".");return n > -1 ? setAtKeyPath(e[unescapeKeyPathComponent(t.slice(0, n))], t.slice(n + 1), r) : (e[unescapeKeyPathComponent(t)] = r, e);
}function _await(e, t, r) {
  return r ? t ? t(e) : e : (e && e.then || (e = Promise.resolve(e)), t ? e.then(t) : e);
}var a = Object.keys,
    i = Array.isArray,
    c = {}.hasOwnProperty,
    s = ["type", "replaced", "iterateIn", "iterateUnsetNumeric"];function _async(e) {
  return function () {
    for (var t = [], r = 0; r < arguments.length; r++) {
      t[r] = arguments[r];
    }try {
      return Promise.resolve(e.apply(this, t));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}function nestedPathsFirst(e, t) {
  if ("" === e.keypath) return -1;var r = e.keypath.match(/\./g) || 0,
      n = t.keypath.match(/\./g) || 0;return r && (r = r.length), n && (n = n.length), r > n ? -1 : r < n ? 1 : e.keypath < t.keypath ? -1 : e.keypath > t.keypath;
}var u = function () {
  function Typeson(e) {
    _classCallCheck(this, Typeson), this.options = e, this.plainObjectReplacers = [], this.nonplainObjectReplacers = [], this.revivers = {}, this.types = {};
  }return function _createClass(e, t, r) {
    return t && _defineProperties(e.prototype, t), r && _defineProperties(e, r), e;
  }(Typeson, [{ key: "stringify", value: function stringify(e, t, r, n) {
      n = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), n), {}, { stringification: !0 });var o = this.encapsulate(e, null, n);return i(o) ? JSON.stringify(o[0], t, r) : o.then(function (e) {
        return JSON.stringify(e, t, r);
      });
    } }, { key: "stringifySync", value: function stringifySync(e, t, r, n) {
      return this.stringify(e, t, r, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, n), {}, { sync: !0 }));
    } }, { key: "stringifyAsync", value: function stringifyAsync(e, t, r, n) {
      return this.stringify(e, t, r, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, n), {}, { sync: !1 }));
    } }, { key: "parse", value: function parse(e, t, r) {
      return r = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), r), {}, { parse: !0 }), this.revive(JSON.parse(e, t), r);
    } }, { key: "parseSync", value: function parseSync(e, t, r) {
      return this.parse(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !0 }));
    } }, { key: "parseAsync", value: function parseAsync(e, t, r) {
      return this.parse(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !1 }));
    } }, { key: "specialTypeNames", value: function specialTypeNames(e, t) {
      var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};return r.returnTypeNames = !0, this.encapsulate(e, t, r);
    } }, { key: "rootTypeName", value: function rootTypeName(e, t) {
      var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};return r.iterateNone = !0, this.encapsulate(e, t, r);
    } }, { key: "encapsulate", value: function encapsulate(t, r, n) {
      var o = _async(function (t, r) {
        return _await(Promise.all(r.map(function (e) {
          return e[1].p;
        })), function (n) {
          return _await(Promise.all(n.map(_async(function (n) {
            var a = !1,
                i = [],
                c = _slicedToArray(r.splice(0, 1), 1),
                s = _slicedToArray(c[0], 7),
                u = s[0],
                p = s[2],
                y = s[3],
                l = s[4],
                f = s[5],
                h = s[6],
                v = _encapsulate(u, n, p, y, i, !0, h),
                d = hasConstructorOf(v, e);return function _invoke(e, t) {
              var r = e();return r && r.then ? r.then(t) : t(r);
            }(function () {
              if (u && d) return _await(v.p, function (e) {
                return l[f] = e, a = !0, o(t, i);
              });
            }, function (e) {
              return a ? e : (u ? l[f] = v : t = d ? v.p : v, o(t, i));
            });
          }))), function () {
            return t;
          });
        });
      }),
          u = (n = _objectSpread2(_objectSpread2({ sync: !0 }, this.options), n)).sync,
          p = this,
          y = {},
          l = [],
          f = [],
          h = [],
          v = !("cyclic" in n) || n.cyclic,
          d = n.encapsulateObserver,
          b = _encapsulate("", t, v, r || {}, h);function finish(e) {
        var t = Object.values(y);if (n.iterateNone) return t.length ? t[0] : Typeson.getJSONType(e);if (t.length) {
          if (n.returnTypeNames) return _toConsumableArray(new Set(t));e && isPlainObject(e) && !c.call(e, "$types") ? e.$types = y : e = { $: e, $types: { $: y } };
        } else isObject(e) && c.call(e, "$types") && (e = { $: e, $types: !0 });return !n.returnTypeNames && e;
      }function _adaptBuiltinStateObjectProperties(e, t, r) {
        Object.assign(e, t);var n = s.map(function (t) {
          var r = e[t];return delete e[t], r;
        });r(), s.forEach(function (t, r) {
          e[t] = n[r];
        });
      }function _encapsulate(t, r, o, s, u, h, v) {
        var b,
            _ = {},
            O = _typeof(r),
            j = d ? function (n) {
          var a = v || s.type || Typeson.getJSONType(r);d(Object.assign(n || _, { keypath: t, value: r, cyclic: o, stateObj: s, promisesData: u, resolvingTypesonPromise: h, awaitingTypesonPromise: hasConstructorOf(r, e) }, { type: a }));
        } : null;if (["string", "boolean", "number", "undefined"].includes(O)) return void 0 === r || Number.isNaN(r) || r === Number.NEGATIVE_INFINITY || r === Number.POSITIVE_INFINITY ? (b = s.replaced ? r : replace(t, r, s, u, !1, h, j)) !== r && (_ = { replaced: b }) : b = r, j && j(), b;if (null === r) return j && j(), r;if (o && !s.iterateIn && !s.iterateUnsetNumeric && r && "object" === _typeof(r)) {
          var m = l.indexOf(r);if (!(m < 0)) return y[t] = "#", j && j({ cyclicKeypath: f[m] }), "#" + f[m];!0 === o && (l.push(r), f.push(t));
        }var S,
            g = isPlainObject(r),
            P = i(r),
            T = (g || P) && (!p.plainObjectReplacers.length || s.replaced) || s.iterateIn ? r : replace(t, r, s, u, g || P, null, j);if (T !== r ? (b = T, _ = { replaced: T }) : "" === t && hasConstructorOf(r, e) ? (u.push([t, r, o, s, void 0, void 0, s.type]), b = r) : P && "object" !== s.iterateIn || "array" === s.iterateIn ? (S = new Array(r.length), _ = { clone: S }) : (["function", "symbol"].includes(_typeof(r)) || "toJSON" in r || hasConstructorOf(r, e) || hasConstructorOf(r, Promise) || hasConstructorOf(r, ArrayBuffer)) && !g && "object" !== s.iterateIn ? b = r : (S = {}, s.addLength && (S.length = r.length), _ = { clone: S }), j && j(), n.iterateNone) return S || b;if (!S) return b;if (s.iterateIn) {
          var w = function _loop(n) {
            var a = { ownKeys: c.call(r, n) };_adaptBuiltinStateObjectProperties(s, a, function () {
              var a = t + (t ? "." : "") + escapeKeyPathComponent(n),
                  i = _encapsulate(a, r[n], Boolean(o), s, u, h);hasConstructorOf(i, e) ? u.push([a, i, Boolean(o), s, S, n, s.type]) : void 0 !== i && (S[n] = i);
            });
          };for (var A in r) {
            w(A);
          }j && j({ endIterateIn: !0, end: !0 });
        } else a(r).forEach(function (n) {
          var a = t + (t ? "." : "") + escapeKeyPathComponent(n);_adaptBuiltinStateObjectProperties(s, { ownKeys: !0 }, function () {
            var t = _encapsulate(a, r[n], Boolean(o), s, u, h);hasConstructorOf(t, e) ? u.push([a, t, Boolean(o), s, S, n, s.type]) : void 0 !== t && (S[n] = t);
          });
        }), j && j({ endIterateOwn: !0, end: !0 });if (s.iterateUnsetNumeric) {
          for (var C = r.length, k = function _loop2(n) {
            if (!(n in r)) {
              var a = t + (t ? "." : "") + n;_adaptBuiltinStateObjectProperties(s, { ownKeys: !1 }, function () {
                var t = _encapsulate(a, void 0, Boolean(o), s, u, h);hasConstructorOf(t, e) ? u.push([a, t, Boolean(o), s, S, n, s.type]) : void 0 !== t && (S[n] = t);
              });
            }
          }, N = 0; N < C; N++) {
            k(N);
          }j && j({ endIterateUnsetNumeric: !0, end: !0 });
        }return S;
      }function replace(e, t, r, n, o, a, i) {
        for (var c = o ? p.plainObjectReplacers : p.nonplainObjectReplacers, s = c.length; s--;) {
          var l = c[s];if (l.test(t, r)) {
            var f = l.type;if (p.revivers[f]) {
              var h = y[e];y[e] = h ? [f].concat(h) : f;
            }return Object.assign(r, { type: f, replaced: !0 }), !u && l.replaceAsync || l.replace ? (i && i({ replacing: !0 }), _encapsulate(e, l[u || !l.replaceAsync ? "replace" : "replaceAsync"](t, r), v && "readonly", r, n, a, f)) : (i && i({ typeDetected: !0 }), _encapsulate(e, t, v && "readonly", r, n, a, f));
          }
        }return t;
      }return h.length ? u && n.throwOnBadSyncType ? function () {
        throw new TypeError("Sync method requested but async result obtained");
      }() : Promise.resolve(o(b, h)).then(finish) : !u && n.throwOnBadSyncType ? function () {
        throw new TypeError("Async method requested but sync result obtained");
      }() : n.stringification && u ? [finish(b)] : u ? finish(b) : Promise.resolve(finish(b));
    } }, { key: "encapsulateSync", value: function encapsulateSync(e, t, r) {
      return this.encapsulate(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !0 }));
    } }, { key: "encapsulateAsync", value: function encapsulateAsync(e, t, r) {
      return this.encapsulate(e, t, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, r), {}, { sync: !1 }));
    } }, { key: "revive", value: function revive(t, r) {
      var n = t && t.$types;if (!n) return t;if (!0 === n) return t.$;var o = (r = _objectSpread2(_objectSpread2({ sync: !0 }, this.options), r)).sync,
          c = [],
          s = {},
          u = !0;n.$ && isPlainObject(n.$) && (t = t.$, n = n.$, u = !1);var y = this;function executeReviver(e, t) {
        var r = _slicedToArray(y.revivers[e] || [], 1)[0];if (!r) throw new Error("Unregistered type: " + e);return o && !("revive" in r) ? t : r[o && r.revive ? "revive" : !o && r.reviveAsync ? "reviveAsync" : "revive"](t, s);
      }var l = [];function checkUndefined(e) {
        return hasConstructorOf(e, p) ? void 0 : e;
      }var f,
          h = function revivePlainObjects() {
        var r = [];if (Object.entries(n).forEach(function (e) {
          var t = _slicedToArray(e, 2),
              o = t[0],
              a = t[1];"#" !== a && [].concat(a).forEach(function (e) {
            _slicedToArray(y.revivers[e] || [null, {}], 2)[1].plain && (r.push({ keypath: o, type: e }), delete n[o]);
          });
        }), r.length) return r.sort(nestedPathsFirst).reduce(function reducer(r, n) {
          var o = n.keypath,
              a = n.type;if (isThenable(r)) return r.then(function (e) {
            return reducer(e, { keypath: o, type: a });
          });var i = getByKeyPath(t, o);if (hasConstructorOf(i = executeReviver(a, i), e)) return i.then(function (e) {
            var r = setAtKeyPath(t, o, e);r === e && (t = r);
          });var c = setAtKeyPath(t, o, i);c === i && (t = c);
        }, void 0);
      }();return hasConstructorOf(h, e) ? f = h.then(function () {
        return t;
      }) : (f = function _revive(t, r, o, s, y) {
        if (!u || "$types" !== t) {
          var f = n[t],
              h = i(r);if (h || isPlainObject(r)) {
            var v = h ? new Array(r.length) : {};for (a(r).forEach(function (n) {
              var a = _revive(t + (t ? "." : "") + escapeKeyPathComponent(n), r[n], o || v, v, n),
                  i = function set(e) {
                return hasConstructorOf(e, p) ? v[n] = void 0 : void 0 !== e && (v[n] = e), e;
              };hasConstructorOf(a, e) ? l.push(a.then(function (e) {
                return i(e);
              })) : i(a);
            }), r = v; c.length;) {
              var d = _slicedToArray(c[0], 4),
                  b = d[0],
                  _ = d[1],
                  O = d[2],
                  j = d[3],
                  m = getByKeyPath(b, _);if (void 0 === m) break;O[j] = m, c.splice(0, 1);
            }
          }if (!f) return r;if ("#" === f) {
            var S = getByKeyPath(o, r.slice(1));return void 0 === S && c.push([o, r.slice(1), s, y]), S;
          }return [].concat(f).reduce(function reducer(t, r) {
            return hasConstructorOf(t, e) ? t.then(function (e) {
              return reducer(e, r);
            }) : executeReviver(r, t);
          }, r);
        }
      }("", t, null), l.length && (f = e.resolve(f).then(function (t) {
        return e.all([t].concat(l));
      }).then(function (e) {
        return _slicedToArray(e, 1)[0];
      }))), isThenable(f) ? o && r.throwOnBadSyncType ? function () {
        throw new TypeError("Sync method requested but async result obtained");
      }() : hasConstructorOf(f, e) ? f.p.then(checkUndefined) : f : !o && r.throwOnBadSyncType ? function () {
        throw new TypeError("Async method requested but sync result obtained");
      }() : o ? checkUndefined(f) : Promise.resolve(checkUndefined(f));
    } }, { key: "reviveSync", value: function reviveSync(e, t) {
      return this.revive(e, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, t), {}, { sync: !0 }));
    } }, { key: "reviveAsync", value: function reviveAsync(e, t) {
      return this.revive(e, _objectSpread2(_objectSpread2({ throwOnBadSyncType: !0 }, t), {}, { sync: !1 }));
    } }, { key: "register", value: function register(e, t) {
      return t = t || {}, [].concat(e).forEach(function R(e) {
        var r = this;if (i(e)) return e.map(function (e) {
          return R.call(r, e);
        });e && a(e).forEach(function (r) {
          if ("#" === r) throw new TypeError("# cannot be used as a type name as it is reserved for cyclic objects");if (Typeson.JSON_TYPES.includes(r)) throw new TypeError("Plain JSON object types are reserved as type names");var n = e[r],
              o = n && n.testPlainObjects ? this.plainObjectReplacers : this.nonplainObjectReplacers,
              a = o.filter(function (e) {
            return e.type === r;
          });if (a.length && (o.splice(o.indexOf(a[0]), 1), delete this.revivers[r], delete this.types[r]), "function" == typeof n) {
            var c = n;n = { test: function test(e) {
                return e && e.constructor === c;
              }, replace: function replace(e) {
                return _objectSpread2({}, e);
              }, revive: function revive(e) {
                return Object.assign(Object.create(c.prototype), e);
              } };
          } else if (i(n)) {
            var s = _slicedToArray(n, 3);n = { test: s[0], replace: s[1], revive: s[2] };
          }if (n && n.test) {
            var u = { type: r, test: n.test.bind(n) };n.replace && (u.replace = n.replace.bind(n)), n.replaceAsync && (u.replaceAsync = n.replaceAsync.bind(n));var p = "number" == typeof t.fallback ? t.fallback : t.fallback ? 0 : Number.POSITIVE_INFINITY;if (n.testPlainObjects ? this.plainObjectReplacers.splice(p, 0, u) : this.nonplainObjectReplacers.splice(p, 0, u), n.revive || n.reviveAsync) {
              var y = {};n.revive && (y.revive = n.revive.bind(n)), n.reviveAsync && (y.reviveAsync = n.reviveAsync.bind(n)), this.revivers[r] = [y, { plain: n.testPlainObjects }];
            }this.types[r] = n;
          }
        }, this);
      }, this), this;
    } }]), Typeson;
}(),
    p = function Undefined() {
  _classCallCheck(this, Undefined);
};p.__typeson__type__ = "TypesonUndefined", u.Undefined = p, u.Promise = e, u.isThenable = isThenable, u.toStringTag = toStringTag, u.hasConstructorOf = hasConstructorOf, u.isObject = isObject, u.isPlainObject = isPlainObject, u.isUserObject = function isUserObject(e) {
  if (!e || "Object" !== toStringTag(e)) return !1;var t = n(e);return !t || hasConstructorOf(e, Object) || isUserObject(t);
}, u.escapeKeyPathComponent = escapeKeyPathComponent, u.unescapeKeyPathComponent = unescapeKeyPathComponent, u.getByKeyPath = getByKeyPath, u.getJSONType = function getJSONType(e) {
  return null === e ? "null" : Array.isArray(e) ? "array" : _typeof(e);
}, u.JSON_TYPES = ["null", "boolean", "number", "string", "array", "object"], module.exports = u;

},{}],9:[function(_dereq_,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _(message, opts) {
    return (opts && opts.context ? opts.context : "Value") + " " + message + ".";
}

function type(V) {
    if (V === null) {
        return "Null";
    }
    switch (typeof V === "undefined" ? "undefined" : _typeof(V)) {
        case "undefined":
            return "Undefined";
        case "boolean":
            return "Boolean";
        case "number":
            return "Number";
        case "string":
            return "String";
        case "symbol":
            return "Symbol";
        case "object":
        // Falls through
        case "function":
        // Falls through
        default:
            // Per ES spec, typeof returns an implemention-defined value that is not any of the existing ones for
            // uncallable non-standard exotic objects. Yet Type() which the Web IDL spec depends on returns Object for
            // such cases. So treat the default case as an object.
            return "Object";
    }
}

// Round x to the nearest integer, choosing the even integer if it lies halfway between two.
function evenRound(x) {
    // There are four cases for numbers with fractional part being .5:
    //
    // case |     x     | floor(x) | round(x) | expected | x <> 0 | x % 1 | x & 1 |   example
    //   1  |  2n + 0.5 |  2n      |  2n + 1  |  2n      |   >    |  0.5  |   0   |  0.5 ->  0
    //   2  |  2n + 1.5 |  2n + 1  |  2n + 2  |  2n + 2  |   >    |  0.5  |   1   |  1.5 ->  2
    //   3  | -2n - 0.5 | -2n - 1  | -2n      | -2n      |   <    | -0.5  |   0   | -0.5 ->  0
    //   4  | -2n - 1.5 | -2n - 2  | -2n - 1  | -2n - 2  |   <    | -0.5  |   1   | -1.5 -> -2
    // (where n is a non-negative integer)
    //
    // Branch here for cases 1 and 4
    if (x > 0 && x % 1 === +0.5 && (x & 1) === 0 || x < 0 && x % 1 === -0.5 && (x & 1) === 1) {
        return censorNegativeZero(Math.floor(x));
    }

    return censorNegativeZero(Math.round(x));
}

function integerPart(n) {
    return censorNegativeZero(Math.trunc(n));
}

function sign(x) {
    return x < 0 ? -1 : 1;
}

function modulo(x, y) {
    // https://tc39.github.io/ecma262/#eqn-modulo
    // Note that http://stackoverflow.com/a/4467559/3191 does NOT work for large modulos
    var signMightNotMatch = x % y;
    if (sign(y) !== sign(signMightNotMatch)) {
        return signMightNotMatch + y;
    }
    return signMightNotMatch;
}

function censorNegativeZero(x) {
    return x === 0 ? 0 : x;
}

function createIntegerConversion(bitLength, typeOpts) {
    var isSigned = !typeOpts.unsigned;

    var lowerBound = void 0;
    var upperBound = void 0;
    if (bitLength === 64) {
        upperBound = Math.pow(2, 53) - 1;
        lowerBound = !isSigned ? 0 : -Math.pow(2, 53) + 1;
    } else if (!isSigned) {
        lowerBound = 0;
        upperBound = Math.pow(2, bitLength) - 1;
    } else {
        lowerBound = -Math.pow(2, bitLength - 1);
        upperBound = Math.pow(2, bitLength - 1) - 1;
    }

    var twoToTheBitLength = Math.pow(2, bitLength);
    var twoToOneLessThanTheBitLength = Math.pow(2, bitLength - 1);

    return function (V, opts) {
        if (opts === undefined) {
            opts = {};
        }

        var x = +V;
        x = censorNegativeZero(x); // Spec discussion ongoing: https://github.com/heycam/webidl/issues/306

        if (opts.enforceRange) {
            if (!Number.isFinite(x)) {
                throw new TypeError(_("is not a finite number", opts));
            }

            x = integerPart(x);

            if (x < lowerBound || x > upperBound) {
                throw new TypeError(_("is outside the accepted range of " + lowerBound + " to " + upperBound + ", inclusive", opts));
            }

            return x;
        }

        if (!Number.isNaN(x) && opts.clamp) {
            x = Math.min(Math.max(x, lowerBound), upperBound);
            x = evenRound(x);
            return x;
        }

        if (!Number.isFinite(x) || x === 0) {
            return 0;
        }
        x = integerPart(x);

        // Math.pow(2, 64) is not accurately representable in JavaScript, so try to avoid these per-spec operations if
        // possible. Hopefully it's an optimization for the non-64-bitLength cases too.
        if (x >= lowerBound && x <= upperBound) {
            return x;
        }

        // These will not work great for bitLength of 64, but oh well. See the README for more details.
        x = modulo(x, twoToTheBitLength);
        if (isSigned && x >= twoToOneLessThanTheBitLength) {
            return x - twoToTheBitLength;
        }
        return x;
    };
}

exports.any = function (V) {
    return V;
};

exports.void = function () {
    return undefined;
};

exports.boolean = function (val) {
    return !!val;
};

exports.byte = createIntegerConversion(8, { unsigned: false });
exports.octet = createIntegerConversion(8, { unsigned: true });

exports.short = createIntegerConversion(16, { unsigned: false });
exports["unsigned short"] = createIntegerConversion(16, { unsigned: true });

exports.long = createIntegerConversion(32, { unsigned: false });
exports["unsigned long"] = createIntegerConversion(32, { unsigned: true });

exports["long long"] = createIntegerConversion(64, { unsigned: false });
exports["unsigned long long"] = createIntegerConversion(64, { unsigned: true });

exports.double = function (V, opts) {
    var x = +V;

    if (!Number.isFinite(x)) {
        throw new TypeError(_("is not a finite floating-point value", opts));
    }

    return x;
};

exports["unrestricted double"] = function (V) {
    var x = +V;

    return x;
};

exports.float = function (V, opts) {
    var x = +V;

    if (!Number.isFinite(x)) {
        throw new TypeError(_("is not a finite floating-point value", opts));
    }

    if (Object.is(x, -0)) {
        return x;
    }

    var y = Math.fround(x);

    if (!Number.isFinite(y)) {
        throw new TypeError(_("is outside the range of a single-precision floating-point value", opts));
    }

    return y;
};

exports["unrestricted float"] = function (V) {
    var x = +V;

    if (isNaN(x)) {
        return x;
    }

    if (Object.is(x, -0)) {
        return x;
    }

    return Math.fround(x);
};

exports.DOMString = function (V, opts) {
    if (opts === undefined) {
        opts = {};
    }

    if (opts.treatNullAsEmptyString && V === null) {
        return "";
    }

    if ((typeof V === "undefined" ? "undefined" : _typeof(V)) === "symbol") {
        throw new TypeError(_("is a symbol, which cannot be converted to a string", opts));
    }

    return String(V);
};

exports.ByteString = function (V, opts) {
    var x = exports.DOMString(V, opts);
    var c = void 0;
    for (var i = 0; (c = x.codePointAt(i)) !== undefined; ++i) {
        if (c > 255) {
            throw new TypeError(_("is not a valid ByteString", opts));
        }
    }

    return x;
};

exports.USVString = function (V, opts) {
    var S = exports.DOMString(V, opts);
    var n = S.length;
    var U = [];
    for (var i = 0; i < n; ++i) {
        var c = S.charCodeAt(i);
        if (c < 0xD800 || c > 0xDFFF) {
            U.push(String.fromCodePoint(c));
        } else if (0xDC00 <= c && c <= 0xDFFF) {
            U.push(String.fromCodePoint(0xFFFD));
        } else if (i === n - 1) {
            U.push(String.fromCodePoint(0xFFFD));
        } else {
            var d = S.charCodeAt(i + 1);
            if (0xDC00 <= d && d <= 0xDFFF) {
                var a = c & 0x3FF;
                var b = d & 0x3FF;
                U.push(String.fromCodePoint((2 << 15) + (2 << 9) * a + b));
                ++i;
            } else {
                U.push(String.fromCodePoint(0xFFFD));
            }
        }
    }

    return U.join("");
};

exports.object = function (V, opts) {
    if (type(V) !== "Object") {
        throw new TypeError(_("is not an object", opts));
    }

    return V;
};

// Not exported, but used in Function and VoidFunction.

// Neither Function nor VoidFunction is defined with [TreatNonObjectAsNull], so
// handling for that is omitted.
function convertCallbackFunction(V, opts) {
    if (typeof V !== "function") {
        throw new TypeError(_("is not a function", opts));
    }
    return V;
}

[Error, ArrayBuffer, // The IsDetachedBuffer abstract operation is not exposed in JS
DataView, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray, Float32Array, Float64Array].forEach(function (func) {
    var name = func.name;
    var article = /^[AEIOU]/.test(name) ? "an" : "a";
    exports[name] = function (V, opts) {
        if (!(V instanceof func)) {
            throw new TypeError(_("is not " + article + " " + name + " object", opts));
        }

        return V;
    };
});

// Common definitions

exports.ArrayBufferView = function (V, opts) {
    if (!ArrayBuffer.isView(V)) {
        throw new TypeError(_("is not a view on an ArrayBuffer object", opts));
    }

    return V;
};

exports.BufferSource = function (V, opts) {
    if (!(ArrayBuffer.isView(V) || V instanceof ArrayBuffer)) {
        throw new TypeError(_("is not an ArrayBuffer object or a view on one", opts));
    }

    return V;
};

exports.DOMTimeStamp = exports["unsigned long long"];

exports.Function = convertCallbackFunction;

exports.VoidFunction = convertCallbackFunction;

},{}]},{},[1])(1)
});
