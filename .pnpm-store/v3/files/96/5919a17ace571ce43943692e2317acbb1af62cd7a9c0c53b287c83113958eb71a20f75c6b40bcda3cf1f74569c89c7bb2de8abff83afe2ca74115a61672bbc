"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _realisticStructuredClone = _interopRequireDefault(require("realistic-structured-clone"));

var _errors = require("./errors.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Built-in structuredClone arrived in Node 17, so we need to keep this file around as long as we support Node 16
// @ts-expect-error
const structuredCloneWrapper = input => {
  if (typeof structuredClone !== "undefined") {
    return structuredClone(input);
  }

  try {
    return (0, _realisticStructuredClone.default)(input);
  } catch (err) {
    throw new _errors.DataCloneError();
  }
};

var _default = structuredCloneWrapper;
exports.default = _default;
module.exports = exports.default;