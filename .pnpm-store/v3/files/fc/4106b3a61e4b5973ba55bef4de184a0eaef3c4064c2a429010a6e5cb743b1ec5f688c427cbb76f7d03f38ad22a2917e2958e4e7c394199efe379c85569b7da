"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _errors = require("./errors.js");

// https://w3c.github.io/IndexedDB/#convert-a-value-to-a-input
const valueToKey = (input, seen) => {
  if (typeof input === "number") {
    if (isNaN(input)) {
      throw new _errors.DataError();
    }

    return input;
  } else if (input instanceof Date) {
    const ms = input.valueOf();

    if (isNaN(ms)) {
      throw new _errors.DataError();
    }

    return new Date(ms);
  } else if (typeof input === "string") {
    return input;
  } else if (input instanceof ArrayBuffer || typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) {
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input).buffer;
    }

    return new Uint8Array(input.buffer).buffer;
  } else if (Array.isArray(input)) {
    if (seen === undefined) {
      seen = new Set();
    } else if (seen.has(input)) {
      throw new _errors.DataError();
    }

    seen.add(input);
    const keys = [];

    for (let i = 0; i < input.length; i++) {
      const hop = input.hasOwnProperty(i);

      if (!hop) {
        throw new _errors.DataError();
      }

      const entry = input[i];
      const key = valueToKey(entry, seen);
      keys.push(key);
    }

    return keys;
  } else {
    throw new _errors.DataError();
  }
};

var _default = valueToKey;
exports.default = _default;
module.exports = exports.default;