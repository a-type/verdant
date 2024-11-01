
      import path from 'path';
      import { fileURLToPath } from 'url';
      import { createRequire as topLevelCreateRequire } from 'module';
      const require = topLevelCreateRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/pad.js
var require_pad = __commonJS({
  "../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/pad.js"(exports, module) {
    module.exports = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length - size);
    };
  }
});

// ../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/fingerprint.js
var require_fingerprint = __commonJS({
  "../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/fingerprint.js"(exports, module) {
    var pad = require_pad();
    var os = __require("os");
    var padding = 2;
    var pid = pad(process.pid.toString(36), padding);
    var hostname = os.hostname();
    var length = hostname.length;
    var hostId = pad(
      hostname.split("").reduce(function(prev, char) {
        return +prev + char.charCodeAt(0);
      }, +length + 36).toString(36),
      padding
    );
    module.exports = function fingerprint() {
      return pid + hostId;
    };
  }
});

// ../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/getRandomValue.js
var require_getRandomValue = __commonJS({
  "../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/lib/getRandomValue.js"(exports, module) {
    var crypto = __require("crypto");
    var lim = Math.pow(2, 32) - 1;
    module.exports = function random() {
      return Math.abs(crypto.randomBytes(4).readInt32BE() / lim);
    };
  }
});

// ../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/index.js
var require_cuid = __commonJS({
  "../node_modules/.pnpm/cuid@2.1.8/node_modules/cuid/index.js"(exports, module) {
    var fingerprint = require_fingerprint();
    var pad = require_pad();
    var getRandomValue = require_getRandomValue();
    var c = 0;
    var blockSize = 4;
    var base = 36;
    var discreteValues = Math.pow(base, blockSize);
    function randomBlock() {
      return pad((getRandomValue() * discreteValues << 0).toString(base), blockSize);
    }
    function safeCounter() {
      c = c < discreteValues ? c : 0;
      c++;
      return c - 1;
    }
    function cuid7() {
      var letter = "c", timestamp = (/* @__PURE__ */ new Date()).getTime().toString(base), counter = pad(safeCounter().toString(base), blockSize), print = fingerprint(), random = randomBlock() + randomBlock();
      return letter + timestamp + counter + print + random;
    }
    cuid7.slug = function slug() {
      var date = (/* @__PURE__ */ new Date()).getTime().toString(36), counter = safeCounter().toString(36).slice(-4), print = fingerprint().slice(0, 1) + fingerprint().slice(-1), random = randomBlock().slice(-2);
      return date.slice(-2) + counter + print + random;
    };
    cuid7.isCuid = function isCuid(stringToCheck) {
      if (typeof stringToCheck !== "string")
        return false;
      if (stringToCheck.startsWith("c"))
        return true;
      return false;
    };
    cuid7.isSlug = function isSlug(stringToCheck) {
      if (typeof stringToCheck !== "string")
        return false;
      var stringLength = stringToCheck.length;
      if (stringLength >= 7 && stringLength <= 10)
        return true;
      return false;
    };
    cuid7.fingerprint = fingerprint;
    module.exports = cuid7;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/rng.js
var require_rng = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/rng.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rng;
    var _crypto = _interopRequireDefault(__require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var rnds8Pool = new Uint8Array(256);
    var poolPtr = rnds8Pool.length;
    function rng() {
      if (poolPtr > rnds8Pool.length - 16) {
        _crypto.default.randomFillSync(rnds8Pool);
        poolPtr = 0;
      }
      return rnds8Pool.slice(poolPtr, poolPtr += 16);
    }
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/regex.js
var require_regex = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/regex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/validate.js
var require_validate = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/validate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _regex = _interopRequireDefault(require_regex());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function validate2(uuid2) {
      return typeof uuid2 === "string" && _regex.default.test(uuid2);
    }
    var _default = validate2;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/stringify.js
var require_stringify = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).substr(1));
    }
    function stringify2(arr, offset = 0) {
      const uuid2 = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      if (!(0, _validate.default)(uuid2)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid2;
    }
    var _default = stringify2;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v1.js
var require_v1 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = _interopRequireDefault(require_stringify());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v12(options, buf, offset) {
      let i = buf && offset || 0;
      const b = buf || new Array(16);
      options = options || {};
      let node = options.node || _nodeId;
      let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        const seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
      let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b[i++] = tl >>> 24 & 255;
      b[i++] = tl >>> 16 & 255;
      b[i++] = tl >>> 8 & 255;
      b[i++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      b[i++] = tmh >>> 8 & 255;
      b[i++] = tmh & 255;
      b[i++] = tmh >>> 24 & 15 | 16;
      b[i++] = tmh >>> 16 & 255;
      b[i++] = clockseq >>> 8 | 128;
      b[i++] = clockseq & 255;
      for (let n = 0; n < 6; ++n) {
        b[i + n] = node[n];
      }
      return buf || (0, _stringify.default)(b);
    }
    var _default = v12;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/parse.js
var require_parse = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function parse2(uuid2) {
      if (!(0, _validate.default)(uuid2)) {
        throw TypeError("Invalid UUID");
      }
      let v;
      const arr = new Uint8Array(16);
      arr[0] = (v = parseInt(uuid2.slice(0, 8), 16)) >>> 24;
      arr[1] = v >>> 16 & 255;
      arr[2] = v >>> 8 & 255;
      arr[3] = v & 255;
      arr[4] = (v = parseInt(uuid2.slice(9, 13), 16)) >>> 8;
      arr[5] = v & 255;
      arr[6] = (v = parseInt(uuid2.slice(14, 18), 16)) >>> 8;
      arr[7] = v & 255;
      arr[8] = (v = parseInt(uuid2.slice(19, 23), 16)) >>> 8;
      arr[9] = v & 255;
      arr[10] = (v = parseInt(uuid2.slice(24, 36), 16)) / 1099511627776 & 255;
      arr[11] = v / 4294967296 & 255;
      arr[12] = v >>> 24 & 255;
      arr[13] = v >>> 16 & 255;
      arr[14] = v >>> 8 & 255;
      arr[15] = v & 255;
      return arr;
    }
    var _default = parse2;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v35.js
var require_v35 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v35.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = _default;
    exports.URL = exports.DNS = void 0;
    var _stringify = _interopRequireDefault(require_stringify());
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
      }
      return bytes;
    }
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function _default(name, version7, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        if (typeof value === "string") {
          value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
          namespace = (0, _parse.default)(namespace);
        }
        if (namespace.length !== 16) {
          throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version7;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = bytes[i];
          }
          return buf;
        }
        return (0, _stringify.default)(bytes);
      }
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/md5.js
var require_md5 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/md5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(__require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("md5").update(bytes).digest();
    }
    var _default = md5;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v3.js
var require_v3 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _md = _interopRequireDefault(require_md5());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v32 = (0, _v.default)("v3", 48, _md.default);
    var _default = v32;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v4.js
var require_v4 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v4.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = _interopRequireDefault(require_stringify());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function v42(options, buf, offset) {
      options = options || {};
      const rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }
        return buf;
      }
      return (0, _stringify.default)(rnds);
    }
    var _default = v42;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/sha1.js
var require_sha1 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/sha1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(__require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("sha1").update(bytes).digest();
    }
    var _default = sha1;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v5.js
var require_v5 = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/v5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _sha = _interopRequireDefault(require_sha1());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v52 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v52;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/nil.js
var require_nil = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/nil.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = "00000000-0000-0000-0000-000000000000";
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/version.js
var require_version = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function version7(uuid2) {
      if (!(0, _validate.default)(uuid2)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid2.substr(14, 1), 16);
    }
    var _default = version7;
    exports.default = _default;
  }
});

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/index.js
var require_dist = __commonJS({
  "../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: function() {
        return _v.default;
      }
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: function() {
        return _v2.default;
      }
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: function() {
        return _v3.default;
      }
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: function() {
        return _v4.default;
      }
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: function() {
        return _nil.default;
      }
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: function() {
        return _version.default;
      }
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: function() {
        return _validate.default;
      }
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: function() {
        return _stringify.default;
      }
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: function() {
        return _parse.default;
      }
    });
    var _v = _interopRequireDefault(require_v1());
    var _v2 = _interopRequireDefault(require_v3());
    var _v3 = _interopRequireDefault(require_v4());
    var _v4 = _interopRequireDefault(require_v5());
    var _nil = _interopRequireDefault(require_nil());
    var _version = _interopRequireDefault(require_version());
    var _validate = _interopRequireDefault(require_validate());
    var _stringify = _interopRequireDefault(require_stringify());
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});

// ../node_modules/.pnpm/object-hash@3.0.0/node_modules/object-hash/index.js
var require_object_hash = __commonJS({
  "../node_modules/.pnpm/object-hash@3.0.0/node_modules/object-hash/index.js"(exports, module) {
    "use strict";
    var crypto = __require("crypto");
    exports = module.exports = objectHash;
    function objectHash(object, options) {
      options = applyDefaults(object, options);
      return hash2(object, options);
    }
    exports.sha1 = function(object) {
      return objectHash(object);
    };
    exports.keys = function(object) {
      return objectHash(object, { excludeValues: true, algorithm: "sha1", encoding: "hex" });
    };
    exports.MD5 = function(object) {
      return objectHash(object, { algorithm: "md5", encoding: "hex" });
    };
    exports.keysMD5 = function(object) {
      return objectHash(object, { algorithm: "md5", encoding: "hex", excludeValues: true });
    };
    var hashes = crypto.getHashes ? crypto.getHashes().slice() : ["sha1", "md5"];
    hashes.push("passthrough");
    var encodings = ["buffer", "hex", "binary", "base64"];
    function applyDefaults(object, sourceOptions) {
      sourceOptions = sourceOptions || {};
      var options = {};
      options.algorithm = sourceOptions.algorithm || "sha1";
      options.encoding = sourceOptions.encoding || "hex";
      options.excludeValues = sourceOptions.excludeValues ? true : false;
      options.algorithm = options.algorithm.toLowerCase();
      options.encoding = options.encoding.toLowerCase();
      options.ignoreUnknown = sourceOptions.ignoreUnknown !== true ? false : true;
      options.respectType = sourceOptions.respectType === false ? false : true;
      options.respectFunctionNames = sourceOptions.respectFunctionNames === false ? false : true;
      options.respectFunctionProperties = sourceOptions.respectFunctionProperties === false ? false : true;
      options.unorderedArrays = sourceOptions.unorderedArrays !== true ? false : true;
      options.unorderedSets = sourceOptions.unorderedSets === false ? false : true;
      options.unorderedObjects = sourceOptions.unorderedObjects === false ? false : true;
      options.replacer = sourceOptions.replacer || void 0;
      options.excludeKeys = sourceOptions.excludeKeys || void 0;
      if (typeof object === "undefined") {
        throw new Error("Object argument required.");
      }
      for (var i = 0; i < hashes.length; ++i) {
        if (hashes[i].toLowerCase() === options.algorithm.toLowerCase()) {
          options.algorithm = hashes[i];
        }
      }
      if (hashes.indexOf(options.algorithm) === -1) {
        throw new Error('Algorithm "' + options.algorithm + '"  not supported. supported values: ' + hashes.join(", "));
      }
      if (encodings.indexOf(options.encoding) === -1 && options.algorithm !== "passthrough") {
        throw new Error('Encoding "' + options.encoding + '"  not supported. supported values: ' + encodings.join(", "));
      }
      return options;
    }
    function isNativeFunction(f) {
      if (typeof f !== "function") {
        return false;
      }
      var exp = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
      return exp.exec(Function.prototype.toString.call(f)) != null;
    }
    function hash2(object, options) {
      var hashingStream;
      if (options.algorithm !== "passthrough") {
        hashingStream = crypto.createHash(options.algorithm);
      } else {
        hashingStream = new PassThrough();
      }
      if (typeof hashingStream.write === "undefined") {
        hashingStream.write = hashingStream.update;
        hashingStream.end = hashingStream.update;
      }
      var hasher = typeHasher(options, hashingStream);
      hasher.dispatch(object);
      if (!hashingStream.update) {
        hashingStream.end("");
      }
      if (hashingStream.digest) {
        return hashingStream.digest(options.encoding === "buffer" ? void 0 : options.encoding);
      }
      var buf = hashingStream.read();
      if (options.encoding === "buffer") {
        return buf;
      }
      return buf.toString(options.encoding);
    }
    exports.writeToStream = function(object, options, stream) {
      if (typeof stream === "undefined") {
        stream = options;
        options = {};
      }
      options = applyDefaults(object, options);
      return typeHasher(options, stream).dispatch(object);
    };
    function typeHasher(options, writeTo, context) {
      context = context || [];
      var write = function(str) {
        if (writeTo.update) {
          return writeTo.update(str, "utf8");
        } else {
          return writeTo.write(str, "utf8");
        }
      };
      return {
        dispatch: function(value) {
          if (options.replacer) {
            value = options.replacer(value);
          }
          var type = typeof value;
          if (value === null) {
            type = "null";
          }
          return this["_" + type](value);
        },
        _object: function(object) {
          var pattern = /\[object (.*)\]/i;
          var objString = Object.prototype.toString.call(object);
          var objType = pattern.exec(objString);
          if (!objType) {
            objType = "unknown:[" + objString + "]";
          } else {
            objType = objType[1];
          }
          objType = objType.toLowerCase();
          var objectNumber = null;
          if ((objectNumber = context.indexOf(object)) >= 0) {
            return this.dispatch("[CIRCULAR:" + objectNumber + "]");
          } else {
            context.push(object);
          }
          if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
            write("buffer:");
            return write(object);
          }
          if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
            if (this["_" + objType]) {
              this["_" + objType](object);
            } else if (options.ignoreUnknown) {
              return write("[" + objType + "]");
            } else {
              throw new Error('Unknown object type "' + objType + '"');
            }
          } else {
            var keys = Object.keys(object);
            if (options.unorderedObjects) {
              keys = keys.sort();
            }
            if (options.respectType !== false && !isNativeFunction(object)) {
              keys.splice(0, 0, "prototype", "__proto__", "constructor");
            }
            if (options.excludeKeys) {
              keys = keys.filter(function(key) {
                return !options.excludeKeys(key);
              });
            }
            write("object:" + keys.length + ":");
            var self2 = this;
            return keys.forEach(function(key) {
              self2.dispatch(key);
              write(":");
              if (!options.excludeValues) {
                self2.dispatch(object[key]);
              }
              write(",");
            });
          }
        },
        _array: function(arr, unordered) {
          unordered = typeof unordered !== "undefined" ? unordered : options.unorderedArrays !== false;
          var self2 = this;
          write("array:" + arr.length + ":");
          if (!unordered || arr.length <= 1) {
            return arr.forEach(function(entry) {
              return self2.dispatch(entry);
            });
          }
          var contextAdditions = [];
          var entries = arr.map(function(entry) {
            var strm = new PassThrough();
            var localContext = context.slice();
            var hasher = typeHasher(options, strm, localContext);
            hasher.dispatch(entry);
            contextAdditions = contextAdditions.concat(localContext.slice(context.length));
            return strm.read().toString();
          });
          context = context.concat(contextAdditions);
          entries.sort();
          return this._array(entries, false);
        },
        _date: function(date) {
          return write("date:" + date.toJSON());
        },
        _symbol: function(sym) {
          return write("symbol:" + sym.toString());
        },
        _error: function(err) {
          return write("error:" + err.toString());
        },
        _boolean: function(bool) {
          return write("bool:" + bool.toString());
        },
        _string: function(string) {
          write("string:" + string.length + ":");
          write(string.toString());
        },
        _function: function(fn) {
          write("fn:");
          if (isNativeFunction(fn)) {
            this.dispatch("[native]");
          } else {
            this.dispatch(fn.toString());
          }
          if (options.respectFunctionNames !== false) {
            this.dispatch("function-name:" + String(fn.name));
          }
          if (options.respectFunctionProperties) {
            this._object(fn);
          }
        },
        _number: function(number) {
          return write("number:" + number.toString());
        },
        _xml: function(xml) {
          return write("xml:" + xml.toString());
        },
        _null: function() {
          return write("Null");
        },
        _undefined: function() {
          return write("Undefined");
        },
        _regexp: function(regex) {
          return write("regex:" + regex.toString());
        },
        _uint8array: function(arr) {
          write("uint8array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint8clampedarray: function(arr) {
          write("uint8clampedarray:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int8array: function(arr) {
          write("int8array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint16array: function(arr) {
          write("uint16array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int16array: function(arr) {
          write("int16array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint32array: function(arr) {
          write("uint32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int32array: function(arr) {
          write("int32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float32array: function(arr) {
          write("float32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float64array: function(arr) {
          write("float64array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _arraybuffer: function(arr) {
          write("arraybuffer:");
          return this.dispatch(new Uint8Array(arr));
        },
        _url: function(url) {
          return write("url:" + url.toString(), "utf8");
        },
        _map: function(map) {
          write("map:");
          var arr = Array.from(map);
          return this._array(arr, options.unorderedSets !== false);
        },
        _set: function(set) {
          write("set:");
          var arr = Array.from(set);
          return this._array(arr, options.unorderedSets !== false);
        },
        _file: function(file) {
          write("file:");
          return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
        },
        _blob: function() {
          if (options.ignoreUnknown) {
            return write("[blob]");
          }
          throw Error('Hashing Blob objects is currently not supported\n(see https://github.com/puleos/object-hash/issues/26)\nUse "options.replacer" or "options.ignoreUnknown"\n');
        },
        _domwindow: function() {
          return write("domwindow");
        },
        _bigint: function(number) {
          return write("bigint:" + number.toString());
        },
        /* Node.js standard native objects */
        _process: function() {
          return write("process");
        },
        _timer: function() {
          return write("timer");
        },
        _pipe: function() {
          return write("pipe");
        },
        _tcp: function() {
          return write("tcp");
        },
        _udp: function() {
          return write("udp");
        },
        _tty: function() {
          return write("tty");
        },
        _statwatcher: function() {
          return write("statwatcher");
        },
        _securecontext: function() {
          return write("securecontext");
        },
        _connection: function() {
          return write("connection");
        },
        _zlib: function() {
          return write("zlib");
        },
        _context: function() {
          return write("context");
        },
        _nodescript: function() {
          return write("nodescript");
        },
        _httpparser: function() {
          return write("httpparser");
        },
        _dataview: function() {
          return write("dataview");
        },
        _signal: function() {
          return write("signal");
        },
        _fsevent: function() {
          return write("fsevent");
        },
        _tlswrap: function() {
          return write("tlswrap");
        }
      };
    }
    function PassThrough() {
      return {
        buf: "",
        write: function(b) {
          this.buf += b;
        },
        end: function(b) {
          this.buf += b;
        },
        read: function() {
          return this.buf;
        }
      };
    }
  }
});

// ../node_modules/.pnpm/tslib@2.6.2/node_modules/tslib/tslib.js
var require_tslib = __commonJS({
  "../node_modules/.pnpm/tslib@2.6.2/node_modules/tslib/tslib.js"(exports, module) {
    var __extends;
    var __assign;
    var __rest;
    var __decorate;
    var __param;
    var __esDecorate;
    var __runInitializers;
    var __propKey;
    var __setFunctionName;
    var __metadata;
    var __awaiter;
    var __generator;
    var __exportStar;
    var __values;
    var __read;
    var __spread;
    var __spreadArrays;
    var __spreadArray;
    var __await;
    var __asyncGenerator;
    var __asyncDelegator;
    var __asyncValues;
    var __makeTemplateObject;
    var __importStar;
    var __importDefault;
    var __classPrivateFieldGet;
    var __classPrivateFieldSet;
    var __classPrivateFieldIn;
    var __createBinding;
    var __addDisposableResource;
    var __disposeResources;
    (function(factory) {
      var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
      if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function(exports2) {
          factory(createExporter(root, createExporter(exports2)));
        });
      } else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
      } else {
        factory(createExporter(root));
      }
      function createExporter(exports2, previous) {
        if (exports2 !== root) {
          if (typeof Object.create === "function") {
            Object.defineProperty(exports2, "__esModule", { value: true });
          } else {
            exports2.__esModule = true;
          }
        }
        return function(id, v) {
          return exports2[id] = previous ? previous(id, v) : v;
        };
      }
    })(function(exporter) {
      var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
        d.__proto__ = b;
      } || function(d, b) {
        for (var p in b)
          if (Object.prototype.hasOwnProperty.call(b, p))
            d[p] = b[p];
      };
      __extends = function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      __rest = function(s, e) {
        var t = {};
        for (var p in s)
          if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
          }
        return t;
      };
      __decorate = function(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
          r = Reflect.decorate(decorators, target, key, desc);
        else
          for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
              r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
      __param = function(paramIndex, decorator) {
        return function(target, key) {
          decorator(target, key, paramIndex);
        };
      };
      __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
        function accept(f) {
          if (f !== void 0 && typeof f !== "function")
            throw new TypeError("Function expected");
          return f;
        }
        var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
        var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
        var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
        var _, done = false;
        for (var i = decorators.length - 1; i >= 0; i--) {
          var context = {};
          for (var p in contextIn)
            context[p] = p === "access" ? {} : contextIn[p];
          for (var p in contextIn.access)
            context.access[p] = contextIn.access[p];
          context.addInitializer = function(f) {
            if (done)
              throw new TypeError("Cannot add initializers after decoration has completed");
            extraInitializers.push(accept(f || null));
          };
          var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
          if (kind === "accessor") {
            if (result === void 0)
              continue;
            if (result === null || typeof result !== "object")
              throw new TypeError("Object expected");
            if (_ = accept(result.get))
              descriptor.get = _;
            if (_ = accept(result.set))
              descriptor.set = _;
            if (_ = accept(result.init))
              initializers.unshift(_);
          } else if (_ = accept(result)) {
            if (kind === "field")
              initializers.unshift(_);
            else
              descriptor[key] = _;
          }
        }
        if (target)
          Object.defineProperty(target, contextIn.name, descriptor);
        done = true;
      };
      __runInitializers = function(thisArg, initializers, value) {
        var useValue = arguments.length > 2;
        for (var i = 0; i < initializers.length; i++) {
          value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
        }
        return useValue ? value : void 0;
      };
      __propKey = function(x) {
        return typeof x === "symbol" ? x : "".concat(x);
      };
      __setFunctionName = function(f, name, prefix) {
        if (typeof name === "symbol")
          name = name.description ? "[".concat(name.description, "]") : "";
        return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
      };
      __metadata = function(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
          return Reflect.metadata(metadataKey, metadataValue);
      };
      __awaiter = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      __generator = function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (g && (g = 0, op[0] && (_ = 0)), _)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      __exportStar = function(m, o) {
        for (var p in m)
          if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
            __createBinding(o, m, p);
      };
      __createBinding = Object.create ? function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        o[k2] = m[k];
      };
      __values = function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      __read = function(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
          return o;
        var i = m.call(o), r, ar = [], e;
        try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
            ar.push(r.value);
        } catch (error) {
          e = { error };
        } finally {
          try {
            if (r && !r.done && (m = i["return"]))
              m.call(i);
          } finally {
            if (e)
              throw e.error;
          }
        }
        return ar;
      };
      __spread = function() {
        for (var ar = [], i = 0; i < arguments.length; i++)
          ar = ar.concat(__read(arguments[i]));
        return ar;
      };
      __spreadArrays = function() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
          s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
          for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
        return r;
      };
      __spreadArray = function(to, from, pack) {
        if (pack || arguments.length === 2)
          for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
              if (!ar)
                ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
            }
          }
        return to.concat(ar || Array.prototype.slice.call(from));
      };
      __await = function(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
      };
      __asyncGenerator = function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
          return this;
        }, i;
        function verb(n) {
          if (g[n])
            i[n] = function(v) {
              return new Promise(function(a, b) {
                q.push([n, v, a, b]) > 1 || resume(n, v);
              });
            };
        }
        function resume(n, v) {
          try {
            step(g[n](v));
          } catch (e) {
            settle(q[0][3], e);
          }
        }
        function step(r) {
          r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
        }
        function fulfill(value) {
          resume("next", value);
        }
        function reject(value) {
          resume("throw", value);
        }
        function settle(f, v) {
          if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]);
        }
      };
      __asyncDelegator = function(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function(e) {
          throw e;
        }), verb("return"), i[Symbol.iterator] = function() {
          return this;
        }, i;
        function verb(n, f) {
          i[n] = o[n] ? function(v) {
            return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
          } : f;
        }
      };
      __asyncValues = function(o) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
          return this;
        }, i);
        function verb(n) {
          i[n] = o[n] && function(v) {
            return new Promise(function(resolve, reject) {
              v = o[n](v), settle(resolve, reject, v.done, v.value);
            });
          };
        }
        function settle(resolve, reject, d, v) {
          Promise.resolve(v).then(function(v2) {
            resolve({ value: v2, done: d });
          }, reject);
        }
      };
      __makeTemplateObject = function(cooked, raw) {
        if (Object.defineProperty) {
          Object.defineProperty(cooked, "raw", { value: raw });
        } else {
          cooked.raw = raw;
        }
        return cooked;
      };
      var __setModuleDefault = Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      };
      __importStar = function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
              __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      __importDefault = function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      __classPrivateFieldGet = function(receiver, state, kind, f) {
        if (kind === "a" && !f)
          throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
          throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
      };
      __classPrivateFieldSet = function(receiver, state, value, kind, f) {
        if (kind === "m")
          throw new TypeError("Private method is not writable");
        if (kind === "a" && !f)
          throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
          throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
      };
      __classPrivateFieldIn = function(state, receiver) {
        if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function")
          throw new TypeError("Cannot use 'in' operator on non-object");
        return typeof state === "function" ? receiver === state : state.has(receiver);
      };
      __addDisposableResource = function(env, value, async) {
        if (value !== null && value !== void 0) {
          if (typeof value !== "object" && typeof value !== "function")
            throw new TypeError("Object expected.");
          var dispose;
          if (async) {
            if (!Symbol.asyncDispose)
              throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
          }
          if (dispose === void 0) {
            if (!Symbol.dispose)
              throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
          }
          if (typeof dispose !== "function")
            throw new TypeError("Object not disposable.");
          env.stack.push({ value, dispose, async });
        } else if (async) {
          env.stack.push({ async: true });
        }
        return value;
      };
      var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
      };
      __disposeResources = function(env) {
        function fail(e) {
          env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
          env.hasError = true;
        }
        function next() {
          while (env.stack.length) {
            var rec = env.stack.pop();
            try {
              var result = rec.dispose && rec.dispose.call(rec.value);
              if (rec.async)
                return Promise.resolve(result).then(next, function(e) {
                  fail(e);
                  return next();
                });
            } catch (e) {
              fail(e);
            }
          }
          if (env.hasError)
            throw env.error;
        }
        return next();
      };
      exporter("__extends", __extends);
      exporter("__assign", __assign);
      exporter("__rest", __rest);
      exporter("__decorate", __decorate);
      exporter("__param", __param);
      exporter("__esDecorate", __esDecorate);
      exporter("__runInitializers", __runInitializers);
      exporter("__propKey", __propKey);
      exporter("__setFunctionName", __setFunctionName);
      exporter("__metadata", __metadata);
      exporter("__awaiter", __awaiter);
      exporter("__generator", __generator);
      exporter("__exportStar", __exportStar);
      exporter("__createBinding", __createBinding);
      exporter("__values", __values);
      exporter("__read", __read);
      exporter("__spread", __spread);
      exporter("__spreadArrays", __spreadArrays);
      exporter("__spreadArray", __spreadArray);
      exporter("__await", __await);
      exporter("__asyncGenerator", __asyncGenerator);
      exporter("__asyncDelegator", __asyncDelegator);
      exporter("__asyncValues", __asyncValues);
      exporter("__makeTemplateObject", __makeTemplateObject);
      exporter("__importStar", __importStar);
      exporter("__importDefault", __importDefault);
      exporter("__classPrivateFieldGet", __classPrivateFieldGet);
      exporter("__classPrivateFieldSet", __classPrivateFieldSet);
      exporter("__classPrivateFieldIn", __classPrivateFieldIn);
      exporter("__addDisposableResource", __addDisposableResource);
      exporter("__disposeResources", __disposeResources);
    });
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/typed-event-interfaces.js
var require_typed_event_interfaces = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/typed-event-interfaces.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/typed-event-functional.js
var require_typed_event_functional = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/typed-event-functional.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.invokeEventHandlersAsync = exports.invokeEventHandlers = exports.eventHandlerSafeInvokeAsync = exports.eventHandlerSafeInvoke = void 0;
    var tslib_1 = require_tslib();
    function eventHandlerSafeInvoke(handler, sender, args) {
      try {
        handler(sender, args);
        return { succeeded: true };
      } catch (error) {
        return { error, succeeded: false };
      }
    }
    exports.eventHandlerSafeInvoke = eventHandlerSafeInvoke;
    function eventHandlerSafeInvokeAsync(handler, sender, args) {
      return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        try {
          yield handler(sender, args);
          return { succeeded: true };
        } catch (error) {
          return { error, succeeded: false };
        }
      });
    }
    exports.eventHandlerSafeInvokeAsync = eventHandlerSafeInvokeAsync;
    function invokeEventHandlers(handlers, sender, args, options) {
      for (const handler of handlers) {
        const { succeeded, error } = eventHandlerSafeInvoke(handler, sender, args);
        if (!succeeded && (options === null || options === void 0 ? void 0 : options.swallowExceptions) !== true) {
          throw error;
        }
      }
    }
    exports.invokeEventHandlers = invokeEventHandlers;
    function invokeEventHandlersAsync(handlers, sender, args, options) {
      return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        if ((options === null || options === void 0 ? void 0 : options.parallelize) === false) {
          for (const handler of handlers) {
            const { succeeded, error } = yield eventHandlerSafeInvokeAsync(handler, sender, args);
            if (!succeeded && (options === null || options === void 0 ? void 0 : options.swallowExceptions) !== true) {
              throw error;
            }
          }
        } else {
          const handlerPromises = [];
          for (const handler of handlers) {
            handlerPromises.push(eventHandlerSafeInvokeAsync(handler, sender, args).then(({ succeeded, error }) => {
              if (!succeeded && (options === null || options === void 0 ? void 0 : options.swallowExceptions) !== true) {
                throw error;
              }
            }));
          }
          yield Promise.all(handlerPromises);
        }
      });
    }
    exports.invokeEventHandlersAsync = invokeEventHandlersAsync;
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/base-typed-event.js
var require_base_typed_event = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/base-typed-event.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypedEvent = void 0;
    var tslib_1 = require_tslib();
    var typed_event_functional_1 = require_typed_event_functional();
    var DEFAULT_INVOCATION_OPTS = {
      swallowExceptions: false,
      parallelize: true
    };
    var TypedEvent = class {
      constructor() {
        this._handlers = [];
      }
      attach(handler) {
        this._handlers.push(handler);
      }
      detach(handler) {
        this.tryRemoveHandler(handler);
      }
      invoke(sender, args, options = DEFAULT_INVOCATION_OPTS) {
        (0, typed_event_functional_1.invokeEventHandlers)(this._handlers, sender, args, options);
      }
      invokeAsync(sender, args, options = DEFAULT_INVOCATION_OPTS) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          yield (0, typed_event_functional_1.invokeEventHandlersAsync)(this._handlers, sender, args, options);
        });
      }
      tryRemoveHandler(handlerToRemove) {
        const handlerIdx = this._handlers.findIndex((handler) => handler === handlerToRemove);
        if (handlerIdx >= 0) {
          this._handlers.splice(handlerIdx, 1);
        }
      }
    };
    exports.TypedEvent = TypedEvent;
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/index.js
var require_base_event = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/base-event/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require_tslib();
    (0, tslib_1.__exportStar)(require_base_typed_event(), exports);
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/errors.js
var require_errors = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FinalizationRegistryMissingError = void 0;
    var FinalizationRegistryMissingError = class extends Error {
    };
    exports.FinalizationRegistryMissingError = FinalizationRegistryMissingError;
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/weak-event-finalization.js
var require_weak_event_finalization = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/weak-event-finalization.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WeakHandlerHolder = void 0;
    var errors_1 = require_errors();
    var WeakHandlerHolder = class {
      constructor(finalizer) {
        this._refs = [];
        try {
          this._finalizationRegistry = new FinalizationRegistry(finalizer);
        } catch (err) {
          const asRefErr = err;
          if (asRefErr.name === "FinalizationRegistry") {
            throw new errors_1.FinalizationRegistryMissingError("FinalizationRegistry is not defined. Weak Events cannot be used.  Please consult 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry' for compatibility information");
          }
          throw err;
        }
      }
      getWeakHandler(eventSource, handler) {
        const handlerRef = new WeakRef(handler);
        this._finalizationRegistry.register(handler, { eventSource, handlerRef }, handlerRef);
        this._refs.push(handlerRef);
        return handlerRef;
      }
      releaseWeakHandler(handler) {
        const existingRef = this._refs.find((ref) => (ref === null || ref === void 0 ? void 0 : ref.deref()) === handler);
        const refToUse = existingRef || new WeakRef(handler);
        this._finalizationRegistry.unregister(refToUse);
        return refToUse;
      }
      unregisterRef(ref) {
        this._finalizationRegistry.unregister(ref);
      }
    };
    exports.WeakHandlerHolder = WeakHandlerHolder;
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/weak-event.js
var require_weak_event = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/weak-event.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WeakEvent = void 0;
    var tslib_1 = require_tslib();
    var base_event_1 = require_base_event();
    var weak_event_finalization_1 = require_weak_event_finalization();
    var typed_event_functional_1 = require_typed_event_functional();
    var DEFAULT_INVOCATION_OPTS = {
      swallowExceptions: false,
      parallelize: true
    };
    var WeakEvent2 = class {
      constructor() {
        this._handlers = [];
        this._handlerFinalizedEvent = new base_event_1.TypedEvent();
        this.handlerFinalizedEvent = this._handlerFinalizedEvent;
        this._refHolder = new weak_event_finalization_1.WeakHandlerHolder((heldValue) => {
          this.onHandlerFinalizer(heldValue);
        });
      }
      invoke(sender, args, options) {
        for (const handlerRef of this._handlers) {
          const dereferencedHandler = handlerRef === null || handlerRef === void 0 ? void 0 : handlerRef.deref();
          if (dereferencedHandler) {
            const { succeeded, error } = (0, typed_event_functional_1.eventHandlerSafeInvoke)(dereferencedHandler, sender, args);
            if (!succeeded && (options === null || options === void 0 ? void 0 : options.swallowExceptions) !== true) {
              throw error;
            }
          } else {
            this.releaseHandler(handlerRef);
          }
        }
      }
      invokeAsync(sender, args, options = DEFAULT_INVOCATION_OPTS) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          if ((options === null || options === void 0 ? void 0 : options.parallelize) === false) {
            yield this.sequentialInvokeAsync(sender, args, options);
          } else {
            yield this.parallelInvokeAsync(sender, args, options);
          }
        });
      }
      sequentialInvokeAsync(sender, args, options) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          for (const handlerRef of this._handlers) {
            const dereferencedHandler = handlerRef === null || handlerRef === void 0 ? void 0 : handlerRef.deref();
            if (dereferencedHandler) {
              const { succeeded, error } = yield (0, typed_event_functional_1.eventHandlerSafeInvokeAsync)(dereferencedHandler, sender, args);
              if (!succeeded && options.swallowExceptions !== true) {
                throw error;
              }
            } else {
              this.releaseHandler(handlerRef);
            }
          }
        });
      }
      parallelInvokeAsync(sender, args, options) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          const handlerPromises = [];
          for (const handlerRef of this._handlers) {
            const dereferencedHandler = handlerRef === null || handlerRef === void 0 ? void 0 : handlerRef.deref();
            if (dereferencedHandler) {
              handlerPromises.push((0, typed_event_functional_1.eventHandlerSafeInvokeAsync)(dereferencedHandler, sender, args).then(({ succeeded, error }) => {
                if (!succeeded && options.swallowExceptions !== true) {
                  throw error;
                }
              }));
            } else {
              this.releaseHandler(handlerRef);
            }
          }
          yield Promise.all(handlerPromises);
        });
      }
      attach(handler) {
        this._handlers.push(this._refHolder.getWeakHandler(this, handler));
      }
      detach(handler) {
        const ref = this._refHolder.releaseWeakHandler(handler);
        this.tryRemoveHandlerRef(ref);
      }
      onHandlerFinalizer(heldValue) {
        this.tryRemoveHandlerRef(heldValue === null || heldValue === void 0 ? void 0 : heldValue.handlerRef);
        this._handlerFinalizedEvent.invokeAsync(this, heldValue, { swallowExceptions: true });
      }
      tryRemoveHandlerRef(ref) {
        const handlerIdx = this._handlers.findIndex((handlerRef) => handlerRef === ref);
        if (handlerIdx >= 0) {
          this._handlers.splice(handlerIdx, 1);
        }
      }
      releaseHandler(ref) {
        this._refHolder.unregisterRef(ref);
        this.tryRemoveHandlerRef(ref);
      }
    };
    exports.WeakEvent = WeakEvent2;
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/index.js
var require_weak_event2 = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/weak-event/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require_tslib();
    (0, tslib_1.__exportStar)(require_weak_event_finalization(), exports);
    (0, tslib_1.__exportStar)(require_weak_event(), exports);
  }
});

// ../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/index.js
var require_dist2 = __commonJS({
  "../node_modules/.pnpm/weak-event@2.0.5/node_modules/weak-event/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require_tslib();
    (0, tslib_1.__exportStar)(require_typed_event_interfaces(), exports);
    (0, tslib_1.__exportStar)(require_base_event(), exports);
    (0, tslib_1.__exportStar)(require_weak_event2(), exports);
  }
});

// ../node_modules/.pnpm/jwt-decode@3.1.2/node_modules/jwt-decode/build/jwt-decode.cjs.js
var require_jwt_decode_cjs = __commonJS({
  "../node_modules/.pnpm/jwt-decode@3.1.2/node_modules/jwt-decode/build/jwt-decode.cjs.js"(exports, module) {
    "use strict";
    function e(e2) {
      this.message = e2;
    }
    e.prototype = new Error(), e.prototype.name = "InvalidCharacterError";
    var r = "undefined" != typeof window && window.atob && window.atob.bind(window) || function(r2) {
      var t2 = String(r2).replace(/=+$/, "");
      if (t2.length % 4 == 1)
        throw new e("'atob' failed: The string to be decoded is not correctly encoded.");
      for (var n2, o2, a2 = 0, i = 0, c = ""; o2 = t2.charAt(i++); ~o2 && (n2 = a2 % 4 ? 64 * n2 + o2 : o2, a2++ % 4) ? c += String.fromCharCode(255 & n2 >> (-2 * a2 & 6)) : 0)
        o2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(o2);
      return c;
    };
    function t(e2) {
      var t2 = e2.replace(/-/g, "+").replace(/_/g, "/");
      switch (t2.length % 4) {
        case 0:
          break;
        case 2:
          t2 += "==";
          break;
        case 3:
          t2 += "=";
          break;
        default:
          throw "Illegal base64url string!";
      }
      try {
        return function(e3) {
          return decodeURIComponent(r(e3).replace(/(.)/g, function(e4, r2) {
            var t3 = r2.charCodeAt(0).toString(16).toUpperCase();
            return t3.length < 2 && (t3 = "0" + t3), "%" + t3;
          }));
        }(t2);
      } catch (e3) {
        return r(t2);
      }
    }
    function n(e2) {
      this.message = e2;
    }
    function o(e2, r2) {
      if ("string" != typeof e2)
        throw new n("Invalid token specified");
      var o2 = true === (r2 = r2 || {}).header ? 0 : 1;
      try {
        return JSON.parse(t(e2.split(".")[o2]));
      } catch (e3) {
        throw new n("Invalid token specified: " + e3.message);
      }
    }
    n.prototype = new Error(), n.prototype.name = "InvalidTokenError";
    var a = o;
    a.default = o, a.InvalidTokenError = n, module.exports = a;
  }
});

// ../packages/common/src/timestamp.ts
var import_cuid = __toESM(require_cuid(), 1);
var MAX_CLOCK_DRIFT = 60 * 1e3;

// ../node_modules/.pnpm/uuid@8.3.2/node_modules/uuid/wrapper.mjs
var import_dist = __toESM(require_dist(), 1);
var v1 = import_dist.default.v1;
var v3 = import_dist.default.v3;
var v4 = import_dist.default.v4;
var v5 = import_dist.default.v5;
var NIL = import_dist.default.NIL;
var version = import_dist.default.version;
var validate = import_dist.default.validate;
var stringify = import_dist.default.stringify;
var parse = import_dist.default.parse;

// ../packages/common/src/refs.ts
function isRef(obj) {
  return isObjectRef(obj) || isFileRef(obj);
}
function compareRefs(a, b) {
  if (a === b)
    return true;
  if (!isRef(a) || !isRef(b))
    return false;
  if (a["@@type"] !== b["@@type"])
    return false;
  if (a.id !== b.id)
    return false;
  return true;
}

// ../packages/common/src/oids.ts
var SEGMENT_SEPARATOR = "/";
var RANDOM_SEPARATOR = ":";
var oidMap = /* @__PURE__ */ new WeakMap();
function maybeGetOid(obj) {
  if (!isObject(obj)) {
    return void 0;
  }
  return oidMap.get(obj);
}
function assignOid(obj, oid) {
  assert(
    isObject(obj),
    `Only objects can be assigned OIDs, received ${JSON.stringify(obj)}`
  );
  if (hasOid(obj)) {
    removeOid(obj);
  }
  oidMap.set(obj, oid);
  return obj;
}
function hasOid(obj) {
  return !!maybeGetOid(obj);
}
function removeOid(obj) {
  oidMap.delete(obj);
  return obj;
}
var SANITIZE_PLACEHOLDERS = {
  ".": "&dot;",
  "/": "&slash;",
  ":": "&colon;"
};
function sanitizeFragment(id) {
  return id.replace(/[/]/g, SANITIZE_PLACEHOLDERS["/"]).replace(/[:]/g, SANITIZE_PLACEHOLDERS[":"]).replace(/[.]/g, SANITIZE_PLACEHOLDERS["."]);
}
function unsanitizeFragment(id) {
  return id.replace(/&slash;/g, "/").replace(/&colon;/g, ":").replace(/&dot;/g, ".");
}
function createOid(collection2, documentId, subId) {
  let oid = sanitizeFragment(collection2) + SEGMENT_SEPARATOR + sanitizeFragment(documentId);
  if (subId) {
    oid += RANDOM_SEPARATOR + subId;
  }
  return oid;
}
function decomposeOid(oid) {
  let [collection2, coreId, ...others] = oid.split("/");
  if (others.length) {
    console.error(
      `OID ${oid} has more than 3 segments. Attempting to parse it anyway.`
    );
    coreId += "/" + others.join("/");
  }
  const [idOrLegacyPathId, random] = coreId.split(RANDOM_SEPARATOR);
  let id;
  if (idOrLegacyPathId.includes(".")) {
    id = idOrLegacyPathId.slice(0, idOrLegacyPathId.indexOf("."));
  } else {
    id = idOrLegacyPathId;
  }
  return {
    collection: unsanitizeFragment(collection2),
    id: unsanitizeFragment(id),
    subId: random
  };
}
function createRef(oid) {
  return {
    "@@type": "ref",
    id: oid
  };
}

// ../packages/common/src/utils.ts
var import_object_hash = __toESM(require_object_hash(), 1);
function cloneDeep(obj, copyOids = true) {
  if (!copyOids && typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  if (isObject(obj) || Array.isArray(obj)) {
    const oid = maybeGetOid(obj);
    let clone;
    if (Array.isArray(obj)) {
      clone = obj.map((v) => cloneDeep(v, copyOids));
    } else {
      clone = {};
      for (const [key, value] of Object.entries(obj)) {
        clone[key] = cloneDeep(value, copyOids);
      }
    }
    if (copyOids && oid) {
      assignOid(clone, oid);
    }
    return clone;
  }
  return obj;
}
function hashObject(obj) {
  return (0, import_object_hash.default)(obj);
}
function isObject(obj) {
  return obj && typeof obj === "object";
}
function assert(condition, message = "assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}
function generateId(length = 16) {
  return v4().replace("-", "").slice(0, length);
}

// ../packages/common/src/files.ts
function isFileRef(value) {
  return value && value["@@type"] === "file";
}
function createFileRef(id) {
  return {
    "@@type": "file",
    id
  };
}
function isFile(value) {
  if (typeof File !== "undefined" && value instanceof File) {
    return true;
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }
  return false;
}
function isFileData(value) {
  return value && isObject(value) && typeof value.id === "string" && typeof value.remote === "boolean" && typeof value.name === "string" && typeof value.type === "string";
}

// ../packages/common/src/oidsLegacy.ts
var LEGACY_OID_KEY = "__@@oid_do_not_use";
var OID_KEY = "@@id";
function convertLegacyOid(oid) {
  const { collection: collection2, id, subId } = decomposeOid(oid);
  return createOid(collection2, id, subId);
}
var MATCH_LEGACY_OID_JSON_STRING = /"\w+\/[^"]+?(\.[^"]+)+\:[\S]+?"/g;
function replaceLegacyOidsInJsonString(string) {
  return string.replaceAll(MATCH_LEGACY_OID_JSON_STRING, (match) => {
    const legacyOid = match.slice(1, match.length - 1);
    return `"${convertLegacyOid(legacyOid)}"`;
  });
}
function replaceLegacyOidsInObject(obj) {
  return JSON.parse(replaceLegacyOidsInJsonString(JSON.stringify(obj)));
}

// ../packages/common/src/operation.ts
function isObjectRef(obj) {
  return obj && typeof obj === "object" && obj["@@type"] === "ref";
}

// ../packages/common/src/schema/fieldHelpers.ts
var import_cuid2 = __toESM(require_cuid(), 1);
var objectField = (args) => {
  return {
    type: "object",
    ...args
  };
};
var arrayField = (args) => {
  return {
    type: "array",
    ...args
  };
};
var stringField = (args) => {
  return {
    type: "string",
    ...args
  };
};
var numberField = (args) => {
  return {
    type: "number",
    ...args
  };
};
var booleanField = (args) => {
  return {
    type: "boolean",
    ...args
  };
};
var anyField = (args) => {
  return {
    type: "any",
    ...args
  };
};
var mapField = (args) => {
  return {
    type: "map",
    ...args
  };
};
var fileField = (args) => {
  return {
    type: "file",
    ...args
  };
};
var idField = () => {
  return {
    type: "string",
    default: import_cuid2.default
  };
};
var fields = {
  object: objectField,
  array: arrayField,
  string: stringField,
  number: numberField,
  boolean: booleanField,
  any: anyField,
  map: mapField,
  file: fileField,
  id: idField
};

// ../packages/common/src/schema/index.ts
var import_cuid3 = __toESM(require_cuid(), 1);

// ../packages/common/src/schema/fields.ts
function isNullable(field) {
  if (field.type === "any")
    return true;
  if (field.type === "map")
    return false;
  return field.nullable;
}
function hasDefault(field) {
  if (!field)
    return false;
  if (field.type === "map")
    return true;
  if (field.type === "array")
    return true;
  if (field.type === "file")
    return false;
  return field.default !== void 0;
}
function getDefault(field) {
  if (!field || !hasDefault(field))
    return void 0;
  if (field.type === "file") {
    if (isNullable(field))
      return null;
    return void 0;
  }
  if (field.type === "map")
    return {};
  if (field.type === "array") {
    if (isNullable(field))
      return null;
    return [];
  }
  if (field.type === "object") {
    if (isNullable(field))
      return null;
    return void 0;
  }
  if (typeof field.default === "function") {
    return field.default();
  }
  return field.default;
}
function traverseCollectionFieldsAndApplyDefaults(value, field) {
  if (value === void 0 || value === null)
    return value;
  if (field.type === "object") {
    for (const [key, subField] of Object.entries(
      field.properties
    )) {
      if (value[key] === void 0) {
        const defaultValue = getFieldDefault(subField);
        if (defaultValue !== void 0) {
          value[key] = defaultValue;
        }
      }
      traverseCollectionFieldsAndApplyDefaults(value[key], subField);
    }
  } else if (field.type === "array") {
    for (const item of value) {
      traverseCollectionFieldsAndApplyDefaults(item, field.items);
    }
  } else if (field.type === "map") {
    for (const [key, item] of Object.entries(value)) {
      if (key === OID_KEY || key === LEGACY_OID_KEY)
        continue;
      traverseCollectionFieldsAndApplyDefaults(item, field.values);
    }
  }
}
function getFieldDefault(field) {
  if (field.type === "string" || field.type === "number" || field.type === "boolean" || field.type === "any") {
    if (field.default && typeof field.default === "function") {
      return field.default();
    } else if (field.default !== void 0) {
      return JSON.parse(JSON.stringify(field.default));
    }
  }
  if (field.type === "array") {
    return [];
  }
  if (field.type === "map") {
    return {};
  }
  if (field.type !== "any" && field.nullable) {
    return null;
  }
  if (field.type === "object" && field.default) {
    const defaultValue = (
      // @ts-ignore
      typeof field.default === "function" ? field.default() : JSON.parse(JSON.stringify(field.default))
    );
    for (const [key, property] of Object.entries(
      field.properties
    )) {
      if (defaultValue[key] === void 0) {
        defaultValue[key] = getFieldDefault(property);
      }
    }
    return defaultValue;
  }
  return void 0;
}

// ../packages/common/src/schema/validation.ts
function validateEntityField({
  field,
  value,
  fieldPath = [],
  depth,
  requireDefaults
}) {
  if (depth !== void 0 && depth <= 0)
    return;
  if (isNullable(field) && value === null)
    return;
  if (value === null) {
    if (requireDefaults || !hasDefault(field)) {
      return {
        type: "no-default",
        fieldPath,
        message: `Invalid null value for field ${formatField(fieldPath)}`
      };
    }
  }
  if (field.type === "object") {
    if (!isObject(value)) {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected object ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
    for (const [key, subField] of Object.entries(
      field.properties
    )) {
      if (key === OID_KEY)
        continue;
      if (value[key]) {
        validateEntityField({
          field: subField,
          value: value[key],
          fieldPath: [...fieldPath, key],
          depth: depth !== void 0 ? depth - 1 : void 0
        });
      }
    }
    for (const key of Object.keys(value)) {
      if (!field.properties[key]) {
        return {
          type: "invalid-key",
          fieldPath: [...fieldPath, key],
          message: `Invalid unexpected field "${key}" on value ${formatField(
            fieldPath
          )}`
        };
      }
    }
  } else if (field.type === "array") {
    if (!Array.isArray(value)) {
      if (value === null && field.nullable)
        return;
      return {
        type: "invalid-value",
        fieldPath,
        message: `Expected array ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
    for (const item of value) {
      validateEntityField({
        field: field.items,
        value: item,
        fieldPath: [...fieldPath, "[]"],
        depth: depth !== void 0 ? depth - 1 : void 0
      });
    }
  } else if (field.type === "map") {
    if (!isObject(value)) {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected map for field ${formatField(
          fieldPath
        )}, got ${value}`
      };
    }
    for (const [key, item] of Object.entries(value)) {
      validateEntityField({
        field: field.values,
        value: item,
        fieldPath: [...fieldPath, key],
        depth: depth !== void 0 ? depth - 1 : void 0
      });
    }
  } else if (field.type === "string") {
    if (typeof value !== "string") {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected string ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
    if (field.options && !field.options.includes(value)) {
      return {
        type: "invalid-value",
        fieldPath,
        message: `Expected one of ${field.options.join(
          ", "
        )} for field ${formatField(fieldPath)}, got ${value}`
      };
    }
  } else if (field.type === "boolean") {
    if (typeof value !== "boolean") {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected boolean ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
  } else if (field.type === "number") {
    if (typeof value !== "number") {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected number ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
  } else if (field.type === "file") {
    if (!isFile(value) && !isFileData(value)) {
      return {
        type: "invalid-type",
        fieldPath,
        message: `Expected file ${field.nullable ? "or null " : ""}for field ${formatField(fieldPath)}, got ${value}`
      };
    }
  }
}
function formatField(fieldPath) {
  if (fieldPath.length === 0)
    return "root";
  return fieldPath.join(".");
}

// ../packages/common/src/schema/children.ts
function getChildFieldSchema(schema2, key) {
  if (schema2.type === "object") {
    return schema2.properties[key];
  } else if (schema2.type === "array") {
    return schema2.items;
  } else if (schema2.type === "map") {
    return schema2.values;
  } else if (schema2.type === "any") {
    return schema2;
  } else if (!("type" in schema2)) {
    return schema2[key] ?? null;
  }
  return null;
}

// ../packages/common/src/schema/index.ts
function collection({
  synthetics,
  indexes,
  ...input
}) {
  const finalIndexes = { ...synthetics, ...indexes };
  for (const [key, field] of Object.entries(input.fields)) {
    if ("indexed" in field) {
      finalIndexes[key] = {
        field: key
      };
    }
  }
  return {
    ...input,
    indexes: finalIndexes
  };
}
function schema(input) {
  return input;
}
schema.collection = collection;
schema.fields = fields;
schema.generated = {
  id: import_cuid3.default
};

// ../packages/common/src/presence.ts
var initialInternalPresence = {};

// ../packages/common/src/EventSubscriber.ts
var EventSubscriber = class {
  constructor(_onAllUnsubscribed) {
    this._onAllUnsubscribed = _onAllUnsubscribed;
    this.subscribers = {};
    this.counts = {};
    this._disabled = false;
    this.disposed = false;
    this.subscriberCount = (event) => {
      return this.counts[event] ?? 0;
    };
    this.totalSubscriberCount = () => {
      return Object.values(this.counts).reduce((acc, count) => acc + count, 0);
    };
    this.subscribe = (event, callback) => {
      const key = generateId();
      let subscribers = this.subscribers[event];
      if (!subscribers) {
        subscribers = this.subscribers[event] = {};
      }
      subscribers[key] = callback;
      this.counts[event] = (this.counts[event] || 0) + 1;
      return () => {
        if (!this.subscribers[event])
          return;
        delete this.subscribers[event][key];
        this.counts[event]--;
        if (this.counts[event] === 0) {
          delete this.subscribers[event];
          delete this.counts[event];
          if (this._onAllUnsubscribed) {
            this._onAllUnsubscribed(event);
          }
        }
      };
    };
    this.emit = (event, ...args) => {
      if (this._disabled)
        return;
      if (this.subscribers[event]) {
        Object.values(this.subscribers[event]).forEach((c) => c(...args));
      }
    };
    this.dispose = () => {
      this._disabled = true;
      this.disposed = true;
      const events = Object.keys(this.subscribers);
      this.subscribers = {};
      this.counts = {};
      events.forEach((event) => {
        if (this._onAllUnsubscribed) {
          this._onAllUnsubscribed(event);
        }
      });
    };
    this.disable = () => {
      this._disabled = true;
    };
  }
  get disabled() {
    return this._disabled;
  }
};

// ../packages/common/src/batching.ts
var Batcher = class {
  constructor(flusher) {
    this.flusher = flusher;
    this.batches = /* @__PURE__ */ new Map();
    this.flush = (key) => {
      const batch = this.batches.get(key);
      if (!batch)
        return;
      return batch.flush();
    };
    this.discard = (key) => {
      const batch = this.batches.get(key);
      if (!batch)
        return;
      batch.discard();
      this.batches.delete(key);
    };
    this.flushAll = () => {
      return [...this.batches.values()].map((batch) => batch.flush());
    };
    this.getSize = (key) => {
      const batch = this.batches.get(key);
      if (!batch)
        return 0;
      return batch.items.length;
    };
  }
  add({
    key,
    userData,
    items: items2,
    max,
    timeout
  }) {
    let batch = this.batches.get(key);
    if (!batch) {
      batch = new Batch({
        max: max || null,
        startedAt: Date.now(),
        userData,
        timeout: timeout || null,
        flusher: this.flusher,
        key
      });
      this.batches.set(key, batch);
    }
    batch.update({
      items: items2,
      max,
      timeout,
      userData
    });
    return batch;
  }
};
var Batch = class {
  constructor({
    max,
    startedAt,
    timeout,
    userData,
    flusher,
    key
  }) {
    this.items = [];
    this.update = ({
      items: items2,
      max,
      timeout,
      userData
    }) => {
      this.items.push(...items2);
      if (max !== void 0)
        this.max = max;
      if (timeout !== void 0)
        this.timeout = timeout;
      if (userData)
        this.userData = userData;
      const needsSchedule = this.items.length !== 0 && this.timeout !== null && !this.flushTimeout;
      if (this.max !== null && this.items.length >= this.max) {
        this.flush();
      } else if (needsSchedule && this.timeout !== null) {
        this.flushTimeout = setTimeout(this.flush, this.timeout);
      }
    };
    this.flush = () => {
      this.flushTimeout && clearTimeout(this.flushTimeout);
      this.flushTimeout = void 0;
      const items2 = this.items;
      this.items = [];
      return this.flusher(items2, this.key, this.userData);
    };
    this.discard = () => {
      this.flushTimeout && clearTimeout(this.flushTimeout);
      this.flushTimeout = void 0;
      this.items = [];
    };
    this.max = max;
    this.startedAt = startedAt;
    this.timeout = timeout;
    this.userData = userData;
    this.flusher = flusher;
    this.key = key;
  }
};

// ../packages/common/src/memo.ts
function memoByKeys(fn, getKeys) {
  let cachedKeys;
  let cachedResult;
  return (...args) => {
    const keys = getKeys();
    if (cachedKeys && cachedKeys.length === keys.length && cachedKeys.every((key, i) => key === keys[i])) {
      return cachedResult;
    }
    cachedKeys = [...keys];
    cachedResult = fn(...args);
    return cachedResult;
  };
}

// ../packages/common/src/error.ts
var VerdantErrorCode = /* @__PURE__ */ ((VerdantErrorCode2) => {
  VerdantErrorCode2[VerdantErrorCode2["InvalidRequest"] = 4e3] = "InvalidRequest";
  VerdantErrorCode2[VerdantErrorCode2["BodyRequired"] = 4001] = "BodyRequired";
  VerdantErrorCode2[VerdantErrorCode2["NoToken"] = 4010] = "NoToken";
  VerdantErrorCode2[VerdantErrorCode2["InvalidToken"] = 4011] = "InvalidToken";
  VerdantErrorCode2[VerdantErrorCode2["TokenExpired"] = 4012] = "TokenExpired";
  VerdantErrorCode2[VerdantErrorCode2["Forbidden"] = 4030] = "Forbidden";
  VerdantErrorCode2[VerdantErrorCode2["NotFound"] = 4040] = "NotFound";
  VerdantErrorCode2[VerdantErrorCode2["Unexpected"] = 5e3] = "Unexpected";
  VerdantErrorCode2[VerdantErrorCode2["ConfigurationError"] = 5010] = "ConfigurationError";
  VerdantErrorCode2[VerdantErrorCode2["NoFileStorage"] = 5011] = "NoFileStorage";
  VerdantErrorCode2[VerdantErrorCode2["MigrationPathNotFound"] = 7001] = "MigrationPathNotFound";
  VerdantErrorCode2[VerdantErrorCode2["ImportFailed"] = 7002] = "ImportFailed";
  VerdantErrorCode2[VerdantErrorCode2["Offline"] = 7003] = "Offline";
  return VerdantErrorCode2;
})(VerdantErrorCode || {});
var VerdantError = class extends Error {
  constructor(code, cause, message) {
    super(message ?? `Verdant error: ${code}`, {
      cause
    });
    this.code = code;
    this.toResponse = () => {
      return JSON.stringify({
        code: this.code
      });
    };
  }
  static {
    this.Code = VerdantErrorCode;
  }
  get httpStatus() {
    const status = Math.floor(this.code / 10);
    if (status < 600) {
      return status;
    }
    return 500;
  }
};

// ../packages/common/src/authz.ts
function encode(str) {
  if (typeof Buffer !== "undefined") {
    const val2 = Buffer.from(str).toString("base64");
    return val2;
  }
  const val = btoa(str);
  return val;
}
function decode(str) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64").toString();
  }
  return atob(str);
}
var authz = {
  onlyUser: (userId) => encode(`u:${userId}:*`),
  onlyMe: () => authz.onlyUser(ORIGINATOR_SUBJECT),
  decode: (encoded) => {
    const decoded = decode(encoded);
    const parts = decoded.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid authz string");
    }
    return {
      scope: parts[0],
      subject: parts[1],
      action: parts[2]
    };
  }
};
var ORIGINATOR_SUBJECT = "$$_originator_$$";

// ../packages/store/src/files/utils.ts
var import_cuid4 = __toESM(require_cuid(), 1);
function createFileData(file) {
  return {
    id: (0, import_cuid4.default)(),
    file,
    url: void 0,
    remote: false,
    name: file.name,
    type: file.type
  };
}
function processValueFiles(value, onFileIdentified) {
  if (typeof window !== "undefined" && isFile(value)) {
    const data = createFileData(value);
    onFileIdentified(data);
    return createFileRef(data.id);
  }
  if (isFileData(value)) {
    const cloned = { ...value, id: (0, import_cuid4.default)() };
    onFileIdentified(cloned);
    return createFileRef(cloned.id);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = processValueFiles(value[i], onFileIdentified);
    }
    return value;
  }
  if (typeof value === "object") {
    for (const key in value) {
      value[key] = processValueFiles(value[key], onFileIdentified);
    }
    return value;
  }
  return value;
}

// ../packages/store/src/entities/EntityCache.ts
var EntityCache = class {
  constructor({ initial } = {}) {
    this.cache = /* @__PURE__ */ new Map();
    this.get = (init) => {
      if (this.cache.has(init.oid)) {
        return this.cache.get(init.oid);
      }
      const entity = new Entity(init);
      this.cache.set(init.oid, entity);
      return entity;
    };
    this.has = (oid) => {
      return this.cache.has(oid);
    };
    this.getCached = (oid) => {
      return this.cache.get(oid);
    };
    if (initial) {
      for (const entity of initial) {
        this.cache.set(entity.oid, entity);
      }
    }
  }
};

// ../packages/store/src/entities/entityFieldSubscriber.ts
function entityFieldSubscriber(entity, field, subscriber) {
  const valueHolder = {
    previousValue: entity.get(field),
    isLocal: false
  };
  function handler(info) {
    if (entity.deleted) {
      return;
    }
    const newValue = entity.get(field);
    if (newValue !== this.previousValue) {
      this.isLocal = info.isLocal;
      subscriber(newValue, this);
      this.previousValue = newValue;
    }
  }
  return entity.subscribe("change", handler.bind(valueHolder));
}

// ../packages/store/src/entities/Entity.ts
var Entity = class _Entity extends EventSubscriber {
  constructor({
    oid,
    schema: schema2,
    entityFamily: childCache,
    parent,
    ctx,
    metadataFamily,
    readonlyKeys,
    files,
    storeEvents,
    deleteSelf
  }) {
    super();
    this.fieldPath = [];
    // an internal representation of this Entity.
    // if present, this is the cached, known value. If null,
    // the entity is deleted. If undefined, we need to recompute
    // the view.
    this._viewData = void 0;
    this.validationError = void 0;
    this.cachedDeepUpdatedAt = null;
    // only used for root entities to track delete/restore state.
    this.wasDeletedLastChange = false;
    this.cachedView = void 0;
    this.onAdd = (_store, data) => {
      if (data.oid === this.oid) {
        this.addConfirmedData(data);
      }
    };
    this.onReplace = (_store, data) => {
      if (data.oid === this.oid) {
        this.replaceAllData(data);
      }
    };
    this.onResetAll = () => {
      this.resetAllData();
    };
    this.childIsNull = (child) => {
      if (child instanceof _Entity) {
        const childView = child.view;
        return childView === null || childView === void 0;
      }
      return child === null || child === void 0;
    };
    /**
     * Introspects the schema of a child field of this entity.
     */
    this.getFieldSchema = (key) => {
      const fieldSchema = getChildFieldSchema(this.schema, key);
      assert(fieldSchema, `No schema for key ${key}`);
      return fieldSchema;
    };
    /**
     * Pruning - when entities have invalid children, we 'prune' that
     * data up to the nearest prunable point - a nullable field,
     * or a list.
     */
    this.validate = memoByKeys(
      () => {
        this.validationError = validateEntityField({
          field: this.schema,
          value: this.rawView,
          fieldPath: this.fieldPath,
          depth: 1
        }) ?? void 0;
        return this.validationError;
      },
      () => [this.viewData]
    );
    this.viewWithMappedChildren = (mapper) => {
      const view = this.view;
      if (!view) {
        return null;
      }
      if (Array.isArray(view)) {
        const mapped = view.map((value) => {
          if (value instanceof _Entity || value instanceof EntityFile) {
            return mapper(value);
          } else {
            return value;
          }
        });
        assignOid(mapped, this.oid);
        return mapped;
      } else {
        const mapped = Object.entries(view).reduce((acc, [key, value]) => {
          if (value instanceof _Entity || value instanceof EntityFile) {
            acc[key] = mapper(value);
          } else {
            acc[key] = value;
          }
          return acc;
        }, {});
        assignOid(mapped, this.oid);
        return mapped;
      }
    };
    /**
     * A current snapshot of this Entity's data, including nested
     * Entities.
     */
    this.getSnapshot = () => {
      return this.viewWithMappedChildren((child) => child.getSnapshot());
    };
    // change management methods (internal use only)
    this.addPendingOperations = (operations) => {
      this.ctx.log("debug", "Entity: adding pending operations", this.oid);
      if (this.access) {
        for (const op of operations) {
          op.authz = this.access;
        }
      }
      const changes = this.metadataFamily.addPendingData(operations);
      for (const change of changes) {
        this.change(change);
      }
    };
    this.addConfirmedData = (data) => {
      this.ctx.log("debug", "Entity: adding confirmed data", this.oid);
      const changes = this.metadataFamily.addConfirmedData(data);
      for (const change of changes) {
        this.change(change);
      }
    };
    this.replaceAllData = (data) => {
      this.ctx.log("debug", "Entity: replacing all data", this.oid);
      const changes = this.metadataFamily.replaceAllData(data);
      for (const change of changes) {
        this.change(change);
      }
    };
    this.resetAllData = () => {
      this.ctx.log("debug", "Entity: resetting all data", this.oid);
      this.cachedDeepUpdatedAt = null;
      this.cachedView = void 0;
      this._viewData = void 0;
      const changes = this.metadataFamily.replaceAllData({});
      for (const change of changes) {
        this.change(change);
      }
    };
    this.invalidateCachedView = () => {
      this._viewData = void 0;
      this.cachedView = void 0;
    };
    this.change = (ev) => {
      if (ev.oid === this.oid) {
        this.invalidateCachedView();
        if (!this.parent) {
          this.changeRoot(ev);
        } else {
          this.changeNested(ev);
        }
      } else {
        const other = this.entityFamily.getCached(ev.oid);
        if (other && other instanceof _Entity) {
          other.change(ev);
        }
      }
    };
    this.changeRoot = (ev) => {
      if (this.deleted) {
        if (!this.wasDeletedLastChange) {
          this.ctx.log("debug", "Entity deleted", this.oid);
          this.emit("delete", { isLocal: ev.isLocal });
          this.wasDeletedLastChange = true;
        }
      } else {
        if (this.wasDeletedLastChange) {
          this.ctx.log("debug", "Entity restored", this.oid);
          this.emit("restore", { isLocal: ev.isLocal });
          this.wasDeletedLastChange = false;
        }
        this.deepChange(this, ev);
        this.emit("change", { isLocal: ev.isLocal });
      }
    };
    this.changeNested = (ev) => {
      this.deepChange(this, ev);
      this.emit("change", { isLocal: ev.isLocal });
    };
    this.deepChange = (target, ev) => {
      this.cachedDeepUpdatedAt = null;
      this.cachedView = void 0;
      this.emit("changeDeep", target, ev);
      this.parent?.deepChange(target, ev);
    };
    this.getChild = (key, oid) => {
      const schema2 = getChildFieldSchema(this.schema, key);
      if (!schema2) {
        throw new Error(
          `No schema for key ${String(key)} in ${JSON.stringify(this.schema)}`
        );
      }
      return this.entityFamily.get({
        oid,
        schema: schema2,
        entityFamily: this.entityFamily,
        metadataFamily: this.metadataFamily,
        parent: this,
        ctx: this.ctx,
        files: this.files,
        fieldPath: [...this.fieldPath, key],
        storeEvents: this.storeEvents,
        deleteSelf: this.delete.bind(this, key)
      });
    };
    this.subscribeToField = (key, event, callback) => {
      return entityFieldSubscriber(this, key, callback);
    };
    // generic entity methods
    /**
     * Gets a value from this Entity. If the value
     * is an object, it will be wrapped in another
     * Entity.
     */
    this.get = (key) => {
      assertNotSymbol(key);
      const view = this.rawView;
      if (!view) {
        throw new Error(
          `Cannot access data at key ${key} on deleted entity ${this.oid}`
        );
      }
      const child = view[key];
      const fieldSchema = getChildFieldSchema(this.schema, key);
      if (!fieldSchema) {
        throw new Error(
          `No schema for key ${String(key)} in ${JSON.stringify(this.schema)}`
        );
      }
      if (isRef(child)) {
        if (isFileRef(child)) {
          if (fieldSchema.type !== "file") {
            throw new Error(
              `Expected file schema for key ${String(key)}, got ${fieldSchema.type}`
            );
          }
          const file = this.files.get(child.id, {
            downloadRemote: !!fieldSchema.downloadRemote,
            ctx: this.ctx
          });
          file.subscribe("change", () => {
            this.deepChange(this, { isLocal: false, oid: this.oid });
          });
          return file;
        } else {
          return this.getChild(key, child.id);
        }
      } else {
        if (this.schema.type === "map" && child === void 0) {
          return void 0;
        }
        if (validateEntityField({
          field: fieldSchema,
          value: child,
          fieldPath: [...this.fieldPath, key],
          depth: 1,
          requireDefaults: true
        })) {
          if (hasDefault(fieldSchema)) {
            return getDefault(fieldSchema);
          }
          if (isNullable(fieldSchema)) {
            return null;
          }
          return void 0;
        }
        return child;
      }
    };
    /**
     * Gets a value on this entity. If the value is not
     * present, it will be set to the provided default
     * and returned synchronously. This method only sets
     * a new value once when a field is empty; subsequent
     * calls will retrieve the created value until it is
     * deleted.
     *
     * Note that this should only be called for nullable
     * fields. If the field is not nullable, the existing
     * value or the default value will always be returned,
     * and the default will not be set.
     */
    this.getOrSet = (key, init) => {
      assertNotSymbol(key);
      const existing = this.get(key);
      if (existing)
        return existing;
      this.set(key, init);
      return this.get(key);
    };
    this.processInputValue = (value, key) => {
      if (this.readonlyKeys.includes(key)) {
        throw new Error(`Cannot set readonly key ${key.toString()}`);
      }
      if (!isFile(value)) {
        value = cloneDeep(value, false);
      }
      const fieldSchema = getChildFieldSchema(this.schema, key);
      if (fieldSchema) {
        traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
        const validationError = validateEntityField({
          field: fieldSchema,
          value,
          fieldPath: [...this.fieldPath, key]
        });
        if (validationError) {
          throw new Error(`Validation error: ${validationError.message}`, {
            cause: validationError
          });
        }
      }
      return processValueFiles(value, this.files.add);
    };
    this.getDeleteMode = (key) => {
      if (this.readonlyKeys.includes(key)) {
        return false;
      }
      if (this.schema.type === "any" || this.schema.type === "map") {
        return "delete";
      }
      if (this.schema.type === "object") {
        const property = this.schema.properties[key];
        if (!property) {
          return "delete";
        }
        if (property.type === "any")
          return "delete";
        if (property.type === "map")
          return false;
        if (property.nullable)
          return "null";
      }
      return false;
    };
    /**
     * Returns the referent value of an item in the list, used for
     * operations which act on items. if the item is an object,
     * it will attempt to create an OID reference to it. If it
     * is a primitive, it will return the primitive.
     */
    this.getItemRefValue = (item) => {
      if (item instanceof _Entity) {
        return createRef(item.oid);
      }
      if (item instanceof EntityFile) {
        return createFileRef(item.id);
      }
      if (typeof item === "object") {
        const itemOid = maybeGetOid(item);
        if (!itemOid || !this.entityFamily.has(itemOid)) {
          throw new Error(
            `Cannot move object ${JSON.stringify(
              item
            )} which does not exist in this list`
          );
        }
        return createRef(itemOid);
      } else {
        return item;
      }
    };
    this.set = (key, value, options) => {
      assertNotSymbol(key);
      if (!options?.force && this.get(key) === value)
        return;
      if (this.isList) {
        this.addPendingOperations(
          this.patchCreator.createListSet(
            this.oid,
            key,
            this.processInputValue(value, key)
          )
        );
      } else {
        this.addPendingOperations(
          this.patchCreator.createSet(
            this.oid,
            key,
            this.processInputValue(value, key)
          )
        );
      }
    };
    /**
     * Returns a destructured version of this Entity, where child
     * Entities are accessible at their respective keys.
     */
    this.getAll = () => {
      return this.view;
    };
    this.delete = (key) => {
      if (this.isList) {
        assertNumber(key);
        this.addPendingOperations(
          this.patchCreator.createListDelete(this.oid, key)
        );
      } else {
        const deleteMode = this.getDeleteMode(key);
        if (!deleteMode) {
          throw new Error(
            `Cannot delete key ${key.toString()} - the property is not marked as optional in the schema.`
          );
        }
        if (deleteMode === "delete") {
          this.addPendingOperations(
            this.patchCreator.createRemove(this.oid, key)
          );
        } else {
          this.addPendingOperations(
            this.patchCreator.createSet(this.oid, key, null)
          );
        }
      }
    };
    // object entity methods
    this.keys = () => {
      if (!this.view)
        return [];
      return Object.keys(this.view);
    };
    this.entries = () => {
      if (!this.view)
        return [];
      return Object.entries(this.view);
    };
    this.values = () => {
      if (!this.view)
        return [];
      return Object.values(this.view);
    };
    this.update = (data, {
      merge = true,
      replaceSubObjects = false,
      preserveUndefined = false
    } = {}) => {
      if (!merge && this.schema.type !== "any" && this.schema.type !== "map") {
        throw new Error(
          'Cannot use .update without merge if the field has a strict schema type. merge: false is only available on "any" or "map" types.'
        );
      }
      const changes = {};
      assignOid(changes, this.oid);
      for (const [key, field] of Object.entries(data)) {
        if (this.readonlyKeys.includes(key)) {
          throw new Error(`Cannot set readonly key ${key.toString()}`);
        }
        if (field === void 0 && !preserveUndefined)
          continue;
        const fieldSchema = getChildFieldSchema(this.schema, key);
        if (fieldSchema) {
          traverseCollectionFieldsAndApplyDefaults(field, fieldSchema);
        }
        changes[key] = this.processInputValue(field, key);
      }
      this.addPendingOperations(
        this.patchCreator.createDiff(this.getSnapshot(), changes, {
          mergeUnknownObjects: !replaceSubObjects,
          defaultUndefined: merge
        })
      );
    };
    this.push = (value) => {
      this.addPendingOperations(
        this.patchCreator.createListPush(
          this.oid,
          this.processInputValue(value, this.view.length)
        )
      );
    };
    this.insert = (index, value) => {
      this.addPendingOperations(
        this.patchCreator.createListInsert(
          this.oid,
          index,
          this.processInputValue(value, index)
        )
      );
    };
    this.move = (from, to) => {
      this.addPendingOperations(
        this.patchCreator.createListMoveByIndex(this.oid, from, to)
      );
    };
    this.moveItem = (item, to) => {
      const itemRef = this.getItemRefValue(item);
      if (isRef(itemRef)) {
        this.addPendingOperations(
          this.patchCreator.createListMoveByRef(this.oid, itemRef, to)
        );
      } else {
        const index = this.view.indexOf(item);
        if (index === -1) {
          throw new Error(
            `Cannot move item ${JSON.stringify(
              item
            )} which does not exist in this list`
          );
        }
        this.move(index, to);
      }
    };
    this.add = (value) => {
      this.addPendingOperations(
        this.patchCreator.createListAdd(
          this.oid,
          this.processInputValue(value, this.view.length)
        )
      );
    };
    this.removeAll = (item) => {
      this.addPendingOperations(
        this.patchCreator.createListRemove(this.oid, this.getItemRefValue(item))
      );
    };
    this.removeFirst = (item) => {
      this.addPendingOperations(
        this.patchCreator.createListRemove(
          this.oid,
          this.getItemRefValue(item),
          "first"
        )
      );
    };
    this.removeLast = (item) => {
      this.addPendingOperations(
        this.patchCreator.createListRemove(
          this.oid,
          this.getItemRefValue(item),
          "last"
        )
      );
    };
    this.map = (callback) => {
      return this.view.map(callback);
    };
    this.filter = (callback) => {
      return this.view.filter(callback);
    };
    this.has = (value) => {
      if (!this.isList) {
        throw new Error("has() is only available on list entities");
      }
      const itemRef = this.getItemRefValue(value);
      if (isRef(itemRef)) {
        return this.view.some((item) => {
          if (isRef(item)) {
            return compareRefs(item, itemRef);
          }
        });
      } else {
        return this.view.includes(value);
      }
    };
    this.forEach = (callback) => {
      this.view.forEach(callback);
    };
    this.reduce = (callback, initialValue) => {
      return this.view.reduce(callback, initialValue);
    };
    this.some = (predicate) => {
      return this.view.some(predicate);
    };
    this.every = (predicate) => {
      return this.view.every(predicate);
    };
    this.find = (predicate) => {
      return this.view.find(predicate);
    };
    this.includes = this.has;
    /**
     * Deletes this entity. WARNING: this can be tricky to
     * use correctly. You must not reference this entity
     * instance in any way after the deletion happens, or
     * you will get an error!
     *
     * It's a little easier to delete using client.delete
     * if you can manage it with your app's code. For example,
     * in React, use hooks.useClient() to get the client and
     * call delete from there.
     */
    this.deleteSelf = () => {
      return this._deleteSelf();
    };
    // TODO: make these escape hatches unnecessary
    this.__getViewData__ = (oid, type) => {
      return this.metadataFamily.get(oid).computeView(type === "confirmed");
    };
    this.__getFamilyOids__ = () => this.metadataFamily.getAllOids();
    this.__discardPendingOperation__ = (operation) => {
      this.metadataFamily.discardPendingOperation(operation);
      this.invalidateCachedView();
    };
    assert(!!oid, "oid is required");
    this.oid = oid;
    this.readonlyKeys = readonlyKeys || [];
    this.ctx = ctx;
    this.files = files;
    this.schema = schema2;
    this.entityFamily = childCache || new EntityCache({
      initial: [this]
    });
    this.metadataFamily = metadataFamily;
    this.storeEvents = storeEvents;
    this.parent = parent;
    this._deleteSelf = deleteSelf;
    if (!this.parent) {
      storeEvents.add.attach(this.onAdd);
      storeEvents.replace.attach(this.onReplace);
      storeEvents.resetAll.attach(this.onResetAll);
    }
  }
  get metadata() {
    return this.metadataFamily.get(this.oid);
  }
  get patchCreator() {
    return this.ctx.patchCreator;
  }
  /**
   * The view of this Entity, not including nested
   * entities (that's the snapshot - see #getSnapshot())
   *
   * Nested entities are represented by refs.
   */
  get viewData() {
    if (this._viewData === void 0) {
      this._viewData = this.metadata.computeView();
      this.validate();
    }
    return this._viewData;
  }
  /** convenience getter for viewData.view */
  get rawView() {
    return this.viewData.view;
  }
  /**
   * An Entity's View includes the rendering of its underlying data,
   * connecting of children where refs were, and validation
   * and pruning according to schema.
   */
  get view() {
    if (this.cachedView !== void 0) {
      return this.cachedView;
    }
    if (this.viewData.deleted) {
      return null;
    }
    const rawView = this.rawView;
    const viewIsWrongType = !rawView && !isNullable(this.schema) || this.schema.type === "array" && !Array.isArray(rawView) || (this.schema.type === "object" || this.schema.type === "map") && !isObject(rawView);
    if (viewIsWrongType) {
      if (hasDefault(this.schema)) {
        return getDefault(this.schema);
      }
      return null;
    }
    this.cachedView = this.isList ? [] : {};
    assignOid(this.cachedView, this.oid);
    if (Array.isArray(rawView)) {
      const schema2 = getChildFieldSchema(this.schema, 0);
      if (!schema2) {
        this.ctx.log(
          "error",
          "No child field schema for list entity.",
          this.oid
        );
      } else {
        for (let i = 0; i < rawView.length; i++) {
          const child = this.get(i);
          if (this.childIsNull(child) && !isNullable(schema2)) {
            this.ctx.log(
              "error",
              "Child missing in non-nullable field",
              this.oid,
              "index:",
              i
            );
          } else {
            this.cachedView.push(child);
          }
        }
      }
    } else if (isObject(rawView)) {
      const keys = this.schema.type === "object" ? Object.keys(this.schema.properties) : Object.keys(rawView);
      for (const key of keys) {
        const schema2 = getChildFieldSchema(this.schema, key);
        if (!schema2) {
          this.ctx.log(
            "error",
            "No child field schema for object entity at key",
            key
          );
          if (this.schema.type === "map") {
            this.cachedView = {};
          } else {
            this.cachedView = null;
          }
          break;
        }
        const child = this.get(key);
        if (this.childIsNull(child) && !isNullable(schema2)) {
          this.ctx.log(
            "error",
            "Child entity is missing for non-nullable field",
            this.oid,
            "key:",
            key
          );
          if (this.schema.type !== "map") {
            this.cachedView = null;
            break;
          }
        } else {
          this.cachedView[key] = child;
        }
      }
    }
    return this.cachedView;
  }
  get uid() {
    return this.oid;
  }
  get deleted() {
    return this.viewData.deleted || this.view === null;
  }
  get invalid() {
    return !!this.validate();
  }
  get isList() {
    return this.schema.type === "array" || Array.isArray(this.viewData.view);
  }
  get updatedAt() {
    return this.viewData.updatedAt;
  }
  get deepUpdatedAt() {
    if (this.cachedDeepUpdatedAt)
      return this.cachedDeepUpdatedAt;
    let latest = this.updatedAt;
    if (this.isList) {
      this.forEach((child) => {
        if (child instanceof _Entity) {
          const childTimestamp = child.deepUpdatedAt;
          if (childTimestamp && (!latest || childTimestamp > latest)) {
            latest = childTimestamp;
          }
        }
      });
    } else {
      this.values().forEach((child) => {
        if (child instanceof _Entity) {
          const childTimestamp = child.deepUpdatedAt;
          if (childTimestamp && (!latest || childTimestamp > latest)) {
            latest = childTimestamp;
          }
        }
      });
    }
    this.cachedDeepUpdatedAt = latest;
    return latest;
  }
  /**
   * @internal - this is relevant to Verdant's system, not users.
   *
   * Indicates whether this document is from an outdated version
   * of the schema - which means it cannot be used until it is upgraded.
   */
  get isOutdatedVersion() {
    if (this.parent)
      return this.parent.isOutdatedVersion;
    return this.viewData.fromOlderVersion;
  }
  /**
   * Returns the storage namespace this entity came from. For example, if you
   * have multiple stores initialized from the same schema, you can use this
   * to figure out where an isolated entity was created / stored.
   */
  get namespace() {
    return this.ctx.namespace;
  }
  /**
   * The authz string signifying the permissions this entity has.
   * On the client (where we are) it's only ever possible to see
   * an entity with either full access or access for the current
   * user.
   */
  get access() {
    return this.viewData.authz;
  }
  get isAuthorized() {
    return !!this.access;
  }
  get size() {
    if (this.isList) {
      return this.length;
    }
    return this.keys().length;
  }
  // array entity methods
  get length() {
    return this.view.length;
  }
  // list implements an iterator which maps items to wrapped
  // versions
  [Symbol.iterator]() {
    let index = 0;
    let length = this.view?.length;
    return {
      next: () => {
        if (index < length) {
          return {
            value: this.get(index++),
            done: false
          };
        }
        return {
          value: void 0,
          done: true
        };
      }
    };
  }
};
function assertNotSymbol(key) {
  if (typeof key === "symbol")
    throw new Error("Symbol keys aren't supported");
}
function assertNumber(key) {
  if (typeof key !== "number")
    throw new Error("Only number keys are supported in list entities");
}

// ../packages/store/src/utils/Disposable.ts
var Disposable = class {
  constructor() {
    this._disposes = [];
    this.disposed = false;
    this.dispose = async () => {
      this.disposed = true;
      await Promise.all(this._disposes.map((dispose) => dispose()));
      this._disposes = [];
    };
    this.compose = (disposable) => this.addDispose(disposable.dispose.bind(disposable));
    this.addDispose = (dispose) => {
      this._disposes.push(dispose);
    };
  }
};

// ../packages/store/src/entities/EntityStore.ts
var import_weak_event = __toESM(require_dist2(), 1);

// ../packages/store/src/files/EntityFile.ts
var UPDATE = Symbol("entity-file-update");
var MARK_FAILED = Symbol("entity-file-mark-failed");
var _a, _b;
var EntityFile = class extends EventSubscriber {
  constructor(id, {
    downloadRemote = false,
    ctx
  }) {
    super();
    this.id = id;
    // cached object URL for a local blob file, if applicable
    this._objectUrl = null;
    this._fileData = null;
    this._loading = true;
    this._failed = false;
    this._downloadRemote = false;
    this.unsubscribes = [];
    this[_a] = (fileData) => {
      this.ctx.log("debug", "EntityFile updated", this.id, fileData);
      this._loading = false;
      this._failed = false;
      this._fileData = fileData;
      if (fileData.file) {
        if (this._objectUrl) {
          URL.revokeObjectURL(this._objectUrl);
        }
        this.ctx.log("debug", "Creating object URL for file", this.id);
        this._objectUrl = URL.createObjectURL(fileData.file);
      }
      this.emit("change");
    };
    this[_b] = () => {
      this._failed = true;
      this._loading = false;
      this.emit("change");
    };
    this.onUploaded = () => {
      if (!this._fileData)
        return;
      this._fileData.remote = true;
      this.ctx.log("debug", "File marked uploaded", this.id, this._fileData);
      this.emit("change");
    };
    this.destroy = () => {
      if (this._objectUrl) {
        URL.revokeObjectURL(this._objectUrl);
      }
      this.dispose();
    };
    this.ctx = ctx;
    this._downloadRemote = downloadRemote;
    this.unsubscribes.push(
      this.ctx.internalEvents.subscribe(`fileUploaded:${id}`, this.onUploaded)
    );
  }
  static {
    _a = UPDATE, _b = MARK_FAILED;
  }
  get downloadRemote() {
    return this._downloadRemote;
  }
  get isFile() {
    return true;
  }
  get isUploaded() {
    return this._fileData?.remote ?? false;
  }
  get url() {
    if (this.loading)
      return null;
    if (this._objectUrl)
      return this._objectUrl;
    return this._fileData?.url ?? null;
  }
  get name() {
    return this._fileData?.name ?? null;
  }
  get type() {
    return this._fileData?.type ?? null;
  }
  get loading() {
    return this._loading;
  }
  get failed() {
    return this._failed;
  }
  getSnapshot() {
    return {
      id: this.id,
      url: this._objectUrl ?? this._fileData?.url ?? void 0,
      name: this.name ?? "unknown-file",
      remote: false,
      type: this.type ?? "",
      file: this._fileData?.file
    };
  }
};

// ../packages/store/src/persistence/idb/util.ts
var globalIDB = typeof window !== "undefined" ? window.indexedDB : void 0;

// ../packages/store/src/queries/utils.ts
function existsFilter(x) {
  return x !== null;
}
function filterResultSet(results) {
  if (Array.isArray(results)) {
    return results.map(filterResultSet).filter(existsFilter);
  } else if (results instanceof Entity) {
    return results.deleted ? null : results;
  } else {
    return results;
  }
}
function areIndexesEqual(a, b) {
  return !a && !b || a && b && hashObject(a) === hashObject(b);
}

// ../packages/store/src/queries/BaseQuery.ts
var ON_ALL_UNSUBSCRIBED = Symbol("ON_ALL_UNSUBSCRIBED");
var UPDATE2 = Symbol("UPDATE");
var _a2;
var BaseQuery = class extends Disposable {
  constructor({
    initial,
    context,
    collection: collection2,
    key,
    shouldUpdate
  }) {
    super();
    this._internalUnsubscribes = [];
    this._status = "initial";
    this._executionPromise = null;
    this.setValue = (value) => {
      this._rawValue = value;
      this.subscribeToDeleteAndRestore(this._rawValue);
      const filtered = filterResultSet(value);
      let changed = true;
      if (this.status === "initializing" || this.status === "initial") {
        changed = true;
      } else {
        if (this.isListQuery) {
          if (this._value.length === filtered.length && this._value.every((v, i) => v === filtered[i])) {
            changed = false;
          }
        } else {
          if (this._value === filtered) {
            changed = false;
          }
        }
      }
      this._value = filtered;
      if (changed) {
        this.context.log("debug", "Query value changed", this.key);
        this._events.emit("change", this._value);
      }
      this.status = "ready";
    };
    // re-applies filtering if results have changed
    this.refreshValue = () => {
      this.setValue(this._rawValue);
    };
    this.subscribeToDeleteAndRestore = (value) => {
      while (this._internalUnsubscribes.length) {
        this._internalUnsubscribes.pop()?.();
      }
      if (Array.isArray(value)) {
        value.forEach((entity) => {
          if (entity instanceof Entity) {
            this._internalUnsubscribes.push(
              entity.subscribe("delete", this.refreshValue)
            );
            this._internalUnsubscribes.push(
              entity.subscribe("restore", this.refreshValue)
            );
          }
        });
      } else if (value instanceof Entity) {
        this._internalUnsubscribes.push(
          value.subscribe("delete", this.refreshValue)
        );
        this._internalUnsubscribes.push(
          value.subscribe("restore", () => {
            this.refreshValue();
          })
        );
      }
    };
    this.execute = () => {
      this.context.log("debug", "Executing query", this.key);
      if (this.status === "initial") {
        this.status = "initializing";
      } else if (this.status === "ready") {
        this.status = "revalidating";
      }
      this._executionPromise = this.run().then(() => this._value).catch((err) => {
        if (err instanceof Error) {
          if (err.name === "InvalidStateError" || err.name === "InvalidAccessError") {
            return this._value;
          }
          throw err;
        } else {
          throw new Error("Unknown error executing query");
        }
      });
      return this._executionPromise;
    };
    this[_a2] = (handler) => {
      this._allUnsubscribedHandler = handler;
    };
    this._rawValue = initial;
    this._value = initial;
    this.isListQuery = Array.isArray(initial);
    this._events = new EventSubscriber(
      (event) => {
        if (event === "change")
          this._allUnsubscribedHandler?.(this);
      }
    );
    this.context = context;
    this.key = key;
    this.collection = collection2;
    const shouldUpdateFn = shouldUpdate || ((collections) => collections.includes(collection2));
    this.addDispose(
      this.context.entityEvents.subscribe(
        "collectionsChanged",
        (collections) => {
          if (shouldUpdateFn(collections)) {
            this.context.log("info", "Updating query", this.key);
            this.execute();
          }
        }
      )
    );
  }
  static {
    _a2 = ON_ALL_UNSUBSCRIBED;
  }
  get current() {
    return this._value;
  }
  get resolved() {
    if (this.status === "ready")
      return Promise.resolve(this._value);
    return this._executionPromise ?? this.execute();
  }
  get subscribed() {
    return this._events.totalSubscriberCount() > 0;
  }
  get status() {
    return this._status;
  }
  set status(v) {
    if (this._status === v)
      return;
    this._status = v;
    this._events.emit("statusChange", this._status);
  }
  get hasDeleted() {
    if (this.isListQuery) {
      return this._rawValue.length !== this._value.length;
    }
    return !!this._rawValue && !this._value;
  }
  subscribe(eventOrCallback, callback) {
    if (callback === void 0 && typeof eventOrCallback === "function") {
      this.resolved;
      return this._events.subscribe("change", eventOrCallback);
    } else if (eventOrCallback === "change" && callback !== void 0) {
      this.resolved;
      return this._events.subscribe("change", callback);
    } else if (eventOrCallback === "statusChange" && typeof callback === "function") {
      return this._events.subscribe(eventOrCallback, callback);
    } else {
      throw new Error("Invalid invocation of Query.subscribe");
    }
  }
  get __rawValue() {
    return this._rawValue;
  }
};

// ../packages/store/src/queries/FindOneQuery.ts
var _a3;
var FindOneQuery = class extends BaseQuery {
  constructor({
    index,
    hydrate,
    ...rest
  }) {
    super({
      initial: null,
      ...rest
    });
    this.run = async () => {
      const oid = await this.context.documents.findOneOid({
        collection: this.collection,
        index: this.index
      });
      this.setValue(oid ? await this.hydrate(oid) : null);
    };
    this[_a3] = (index) => {
      if (areIndexesEqual(this.index, index))
        return;
      this.index = index;
      this.execute();
    };
    this.index = index;
    this.hydrate = hydrate;
  }
  static {
    _a3 = UPDATE2;
  }
};

// ../packages/store/src/queries/FindPageQuery.ts
var _a4;
var FindPageQuery = class extends BaseQuery {
  constructor({
    index,
    hydrate,
    pageSize,
    page,
    ...rest
  }) {
    super({
      initial: [],
      ...rest
    });
    this._hasNextPage = false;
    this.run = async () => {
      const { result, hasNextPage } = await this.context.documents.findAllOids({
        collection: this.collection,
        index: this.index,
        limit: this._pageSize,
        offset: this._page * this._pageSize
      });
      this._hasNextPage = hasNextPage;
      this.setValue(await Promise.all(result.map(this.hydrate)));
    };
    this.nextPage = async () => {
      if (!this.hasNextPage)
        return;
      this._page++;
      await this.run();
    };
    this.previousPage = async () => {
      if (this._page === 0)
        return;
      this._page--;
      await this.run();
    };
    this.setPage = async (page) => {
      this._page = page;
      await this.run();
    };
    this[_a4] = (index) => {
      if (areIndexesEqual(this.index, index))
        return;
      this.index = index;
      this.execute();
    };
    this.index = index;
    this.hydrate = hydrate;
    this._pageSize = pageSize;
    this._page = page;
  }
  static {
    _a4 = UPDATE2;
  }
  get pageSize() {
    return this._pageSize;
  }
  get page() {
    return this._page;
  }
  get hasNextPage() {
    return this._hasNextPage;
  }
  get hasPreviousPage() {
    return this._page > 0;
  }
};

// ../packages/store/src/queries/FindInfiniteQuery.ts
var _a5;
var FindInfiniteQuery = class extends BaseQuery {
  constructor({
    hydrate,
    pageSize,
    index,
    ...rest
  }) {
    super({
      initial: [],
      ...rest
    });
    this._upToPage = 1;
    this._hasNextPage = false;
    this.run = async () => {
      const { result, hasNextPage } = await this.context.documents.findAllOids({
        collection: this.collection,
        limit: this._pageSize * this._upToPage,
        offset: 0,
        index: this.index
      });
      this._hasNextPage = hasNextPage;
      this.setValue(await Promise.all(result.map(this.hydrate)));
    };
    this.loadMore = async () => {
      const { result, hasNextPage } = await this.context.documents.findAllOids({
        collection: this.collection,
        limit: this._pageSize,
        offset: this._pageSize * this._upToPage,
        index: this.index
      });
      this._hasNextPage = hasNextPage;
      this._upToPage++;
      this.setValue([
        ...this.current,
        ...await Promise.all(result.map(this.hydrate))
      ]);
    };
    this[_a5] = (index) => {
      if (areIndexesEqual(this.index, index))
        return;
      this.index = index;
      this.execute();
    };
    this.index = index;
    this.hydrate = hydrate;
    this._pageSize = pageSize;
  }
  static {
    _a5 = UPDATE2;
  }
  get pageSize() {
    return this._pageSize;
  }
  get hasMore() {
    return this._hasNextPage;
  }
};

// ../packages/store/src/queries/FindAllQuery.ts
var _a6;
var FindAllQuery = class extends BaseQuery {
  constructor({
    index,
    hydrate,
    ...rest
  }) {
    super({
      initial: [],
      ...rest
    });
    this.run = async () => {
      const { result: oids } = await this.context.documents.findAllOids({
        collection: this.collection,
        index: this.index
      });
      this.context.log(
        "debug",
        `FindAllQuery: ${oids.length} oids found: ${oids}`
      );
      this.setValue(await Promise.all(oids.map(this.hydrate)));
    };
    this[_a6] = (index) => {
      if (areIndexesEqual(this.index, index))
        return;
      this.index = index;
      this.execute();
    };
    this.index = index;
    this.hydrate = hydrate;
  }
  static {
    _a6 = UPDATE2;
  }
};

// ../packages/store/src/sync/PresenceManager.ts
var HANDLE_MESSAGE = Symbol("handleMessage");
var _a7;
var PresenceManager = class extends EventSubscriber {
  constructor({
    initialPresence,
    updateBatchTimeout = 200,
    defaultProfile,
    ctx
  }) {
    super();
    this._peers = {};
    this._self = { profile: {} };
    // keep track of own replica IDs - applications may care if we're "alone" but with multiple devices.
    this._selfReplicaIds = /* @__PURE__ */ new Set();
    this._peerIds = new Array();
    /**
     * Decides if an update is for the local user or not. Even if it's a different replica
     * than the local one.
     *
     * If the replicaId matches, we use that first - we may not know the local replica's User ID yet,
     * e.g. on the first presence update.
     *
     * Otherwise, match the user ID to our local copy.
     */
    this.isSelf = (localReplicaInfo, userInfo) => {
      return localReplicaInfo.id === userInfo.replicaId || this._selfReplicaIds.has(userInfo.replicaId) || this._self.id === userInfo.id;
    };
    this[_a7] = async (localReplicaInfo, message) => {
      let peersChanged = false;
      let selfChanged = false;
      const peerIdsSet = new Set(this.peerIds);
      if (message.type === "presence-changed") {
        if (this.isSelf(localReplicaInfo, message.userInfo)) {
          this._self = message.userInfo;
          this._selfReplicaIds.add(message.userInfo.replicaId);
          selfChanged = true;
          this.emit("selfChanged", message.userInfo);
        } else {
          peerIdsSet.add(message.userInfo.id);
          this._peers[message.userInfo.id] = message.userInfo;
          peersChanged = true;
          this.emit("peerChanged", message.userInfo.id, message.userInfo);
        }
      } else if (message.type === "sync-resp") {
        this._peers = {};
        peerIdsSet.clear();
        for (const [id, userInfo] of Object.entries(message.peerPresence)) {
          if (this.isSelf(localReplicaInfo, userInfo)) {
            this._self = userInfo;
            this._selfReplicaIds.add(userInfo.replicaId);
            selfChanged = true;
            this.emit("selfChanged", userInfo);
          } else {
            peersChanged = true;
            peerIdsSet.add(id);
            this._peers[id] = userInfo;
            this.emit("peerChanged", id, userInfo);
          }
        }
      } else if (message.type === "presence-offline") {
        peerIdsSet.delete(message.userId);
        this._selfReplicaIds.delete(message.replicaId);
        const lastPresence = this._peers[message.userId];
        delete this._peers[message.userId];
        peersChanged = true;
        this.emit("peerLeft", message.userId, lastPresence);
      }
      if (peersChanged) {
        this._peerIds = Array.from(peerIdsSet).sort();
        this.emit("peersChanged", this._peers);
      }
      if (peersChanged || selfChanged) {
        this.emit("change");
      }
    };
    this.update = async (presence) => {
      this._updateBatch.update({
        items: [{ presence }]
      });
      this.self.presence = { ...this.self.presence, ...presence };
      this.emit("selfChanged", this.self);
      this.emit("change");
    };
    this.flushPresenceUpdates = (presenceUpdates) => {
      const data = {
        presence: this.self.presence,
        internal: this.self.internal
      };
      for (const update of presenceUpdates) {
        if (update.presence) {
          Object.assign(data.presence, update.presence);
        }
        if (update.internal) {
          Object.assign(data.internal, update.internal);
        }
      }
      this.emit("update", data);
    };
    this.setViewId = (viewId) => {
      this._updateBatch.update({
        items: [{ internal: { viewId } }]
      });
      this.self.internal.viewId = viewId;
      this.emit("selfChanged", this.self);
      this.emit("change");
    };
    this.setFieldId = (fieldId, timestamp = Date.now()) => {
      this._updateBatch.update({
        items: [
          { internal: { lastFieldId: fieldId, lastFieldTimestamp: timestamp } }
        ]
      });
      this.self.internal.lastFieldId = fieldId;
      this.emit("selfChanged", this.self);
      this.emit("change");
    };
    /**
     * Get all peers that are in the same view as the local user.
     */
    this.getViewPeers = () => {
      return this._peerIds.map((id) => this._peers[id]).filter(
        (peer) => this.self.internal.viewId === void 0 || peer.internal.viewId === this.self.internal.viewId
      );
    };
    /**
     * Get all peers that have interacted with the specified
     * field most recently.
     */
    this.getFieldPeers = (fieldId, expirationPeriod = 60 * 1e3) => {
      return this._peerIds.map((id) => this._peers[id]).filter(
        (peer) => peer.internal.lastFieldId === fieldId && Date.now() - peer.internal.lastFieldTimestamp < expirationPeriod
      );
    };
    this.self.presence = initialPresence;
    this.self.profile = defaultProfile;
    this.self.internal = initialInternalPresence;
    this.self.id = "";
    this.self.replicaId = "";
    ctx.meta.getLocalReplica().then((info) => {
      this.self.replicaId = info.id;
    });
    this._updateBatcher = new Batcher(this.flushPresenceUpdates);
    this._updateBatch = this._updateBatcher.add({
      max: 25,
      timeout: updateBatchTimeout,
      items: [],
      key: "default"
    });
  }
  static {
    _a7 = HANDLE_MESSAGE;
  }
  get self() {
    return this._self;
  }
  get peers() {
    return this._peers;
  }
  get peerIds() {
    return this._peerIds;
  }
  get everyone() {
    const everyone = { ...this._peers };
    everyone[this.self.id] = this.self;
    return everyone;
  }
  get selfReplicaIds() {
    return this._selfReplicaIds;
  }
};

// ../packages/store/src/sync/ServerSyncEndpointProvider.ts
var import_jwt_decode = __toESM(require_jwt_decode_cjs(), 1);

// ../packages/store/src/persistence/PersistenceMetadata.ts
var import_cuid5 = __toESM(require_cuid(), 1);

// ../packages/store/src/persistence/idb/metadata/openMetadataDatabase.ts
var migrations = [version1, version2, version3, version4, version5, version6];
var CURRENT_METADATA_VERSION = migrations.length;
async function version1(db, tx) {
  const baselinesStore = db.createObjectStore("baselines", {
    keyPath: "oid"
  });
  const operationsStore = db.createObjectStore("operations", {
    keyPath: "oid_timestamp"
  });
  const infoStore = db.createObjectStore("info", { keyPath: "type" });
  baselinesStore.createIndex("timestamp", "timestamp");
  operationsStore.createIndex("isLocal_timestamp", "isLocal_timestamp");
  operationsStore.createIndex("documentOid_timestamp", "documentOid_timestamp");
}
async function version2(db, tx) {
  const operations = tx.objectStore("operations");
  await new Promise((resolve, reject) => {
    const cursorReq = operations.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const { isLocal_timestamp, documentOid_timestamp, ...value } = cursor.value;
        cursor.update({
          ...value,
          l_t: isLocal_timestamp,
          d_t: documentOid_timestamp
        });
        cursor.continue();
      } else {
        resolve();
      }
    };
    cursorReq.onerror = (event) => {
      reject(cursorReq.error);
    };
  });
  operations.deleteIndex("isLocal_timestamp");
  operations.deleteIndex("documentOid_timestamp");
  operations.createIndex("l_t", "l_t", { unique: false });
  operations.createIndex("o_t", "o_t", { unique: false });
  operations.createIndex("d_t", "d_t", { unique: false });
}
async function version3(db, tx) {
  const operations = tx.objectStore("operations");
  operations.createIndex("timestamp", "timestamp");
}
async function version4(db, tx) {
  const files = db.createObjectStore("files", {
    keyPath: "id"
  });
  files.createIndex("remote", "remote");
  files.createIndex("deletedAt", "deletedAt");
}
async function version5(db, tx) {
  const operations = tx.objectStore("operations");
  await new Promise((resolve, reject) => {
    const cursorReq = operations.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const converted = replaceLegacyOidsInObject(cursor.value);
        if (converted.oid_timestamp !== cursor.primaryKey) {
          cursor.delete();
          operations.put(converted);
        } else {
          cursor.update(converted);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    cursorReq.onerror = (event) => {
      reject(cursorReq.error);
    };
  });
  const baselines = tx.objectStore("baselines");
  await new Promise((resolve, reject) => {
    const cursorReq = baselines.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const converted = replaceLegacyOidsInObject(cursor.value);
        if (converted.oid !== cursor.primaryKey) {
          cursor.delete();
          baselines.put(converted);
        } else {
          cursor.update(converted);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    cursorReq.onerror = (event) => {
      reject(cursorReq.error);
    };
  });
}
async function version6(db, tx) {
  const files = tx.objectStore("files");
  files.createIndex("timestamp", "timestamp");
}

// ../packages/store/src/client/ClientDescriptor.ts
var defaultBrowserEnvironment = {
  WebSocket,
  fetch: typeof window !== "undefined" ? window.fetch.bind(window) : fetch,
  indexedDB
};

// ../packages/store/src/utils/id.ts
var import_cuid6 = __toESM(require_cuid(), 1);

// ../packages/store/src/authorization.ts
var authorization = {
  private: authz.onlyMe(),
  public: void 0
};

// schema.ts
var items = schema.collection({
  name: "item",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => Math.random().toString(36).slice(2, 9)
    }),
    content: schema.fields.string({
      default: ""
    }),
    tags: schema.fields.array({
      items: schema.fields.string({
        options: ["a", "b", "c"]
      })
    }),
    purchased: schema.fields.boolean({
      default: false
    }),
    categoryId: schema.fields.string({
      nullable: true
    }),
    comments: schema.fields.array({
      items: schema.fields.object({
        properties: {
          id: schema.fields.string({
            default: () => Math.random().toString(36).slice(2, 9)
          }),
          content: schema.fields.string({
            default: ""
          }),
          authorId: schema.fields.string()
        }
      })
    }),
    image: schema.fields.file({
      nullable: true
    })
  },
  indexes: {
    categoryId: {
      field: "categoryId"
    },
    purchasedYesNo: {
      type: "string",
      compute(item) {
        return item.purchased ? "yes" : "no";
      }
    }
  }
});
var categories = schema.collection({
  name: "category",
  pluralName: "categories",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => Math.random().toString(36).slice(2, 9)
    }),
    name: schema.fields.string(),
    metadata: schema.fields.object({
      nullable: true,
      properties: {
        color: schema.fields.string()
      }
    })
  },
  indexes: {
    name: {
      field: "name"
    }
  }
});
var schema_default = schema({
  version: 1,
  collections: {
    items,
    categories
  }
});

// temp-unS9nY/readFile.ts
console.log(
  JSON.stringify(
    schema_default,
    // convert all functions to "FUNCTION"
    (key, value) => typeof value === "function" ? "FUNCTION" : value
  )
);
process.exit(0);
