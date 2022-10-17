import { relative } from 'path';
import { r as relative$1, p as picocolors, E as EXIT_CODE_RESTART } from './chunk-constants.71e8a211.mjs';
import { isPackageExists } from 'local-pkg';

const RealDate = Date;
let now = null;
class MockDate extends RealDate {
  constructor(y, m, d, h, M, s, ms) {
    super();
    let date;
    switch (arguments.length) {
      case 0:
        if (now !== null)
          date = new RealDate(now.valueOf());
        else
          date = new RealDate();
        break;
      case 1:
        date = new RealDate(y);
        break;
      default:
        d = typeof d === "undefined" ? 1 : d;
        h = h || 0;
        M = M || 0;
        s = s || 0;
        ms = ms || 0;
        date = new RealDate(y, m, d, h, M, s, ms);
        break;
    }
    return date;
  }
}
MockDate.UTC = RealDate.UTC;
MockDate.now = function() {
  return new MockDate().valueOf();
};
MockDate.parse = function(dateString) {
  return RealDate.parse(dateString);
};
MockDate.toString = function() {
  return RealDate.toString();
};
function mockDate(date) {
  const dateObj = new RealDate(date.valueOf());
  if (isNaN(dateObj.getTime()))
    throw new TypeError(`mockdate: The time set is an invalid date: ${date}`);
  globalThis.Date = MockDate;
  now = dateObj.valueOf();
}
function resetDate() {
  globalThis.Date = RealDate;
}

function isFinalObj(obj) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype;
}
function collectOwnProperties(obj, collector) {
  const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect);
  Object.getOwnPropertySymbols(obj).forEach(collect);
}
function getAllMockableProperties(obj) {
  const allProps = /* @__PURE__ */ new Set();
  let curr = obj;
  do {
    if (isFinalObj(curr))
      break;
    collectOwnProperties(curr, (key) => {
      const descriptor = Object.getOwnPropertyDescriptor(curr, key);
      if (descriptor)
        allProps.add({ key, descriptor });
    });
  } while (curr = Object.getPrototypeOf(curr));
  return Array.from(allProps);
}
function notNullish(v) {
  return v != null;
}
function slash(str) {
  return str.replace(/\\/g, "/");
}
function mergeSlashes(str) {
  return str.replace(/\/\//g, "/");
}
const noop = () => {
};
function getType(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function getOwnProperties(obj) {
  const ownProps = /* @__PURE__ */ new Set();
  if (isFinalObj(obj))
    return [];
  collectOwnProperties(obj, ownProps);
  return Array.from(ownProps);
}
function deepClone(val) {
  const seen = /* @__PURE__ */ new WeakMap();
  return clone(val, seen);
}
function clone(val, seen) {
  let k, out;
  if (seen.has(val))
    return seen.get(val);
  if (Array.isArray(val)) {
    out = Array(k = val.length);
    seen.set(val, out);
    while (k--)
      out[k] = clone(val[k], seen);
    return out;
  }
  if (Object.prototype.toString.call(val) === "[object Object]") {
    out = Object.create(Object.getPrototypeOf(val));
    seen.set(val, out);
    const props = getOwnProperties(val);
    for (const k2 of props)
      out[k2] = clone(val[k2], seen);
    return out;
  }
  return val;
}
function toArray(array) {
  if (array === null || array === void 0)
    array = [];
  if (Array.isArray(array))
    return array;
  return [array];
}
const toString = (v) => Object.prototype.toString.call(v);
const isPlainObject = (val) => toString(val) === "[object Object]" && (!val.constructor || val.constructor.name === "Object");
function isObject(item) {
  return item != null && typeof item === "object" && !Array.isArray(item);
}
function deepMerge(target, ...sources) {
  if (!sources.length)
    return target;
  const source = sources.shift();
  if (source === void 0)
    return target;
  if (isMergeableObject(target) && isMergeableObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isMergeableObject(source[key])) {
        if (!target[key])
          target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }
  return deepMerge(target, ...sources);
}
function isMergeableObject(item) {
  return isPlainObject(item) && !Array.isArray(item);
}
function assertTypes(value, name, types) {
  const receivedType = typeof value;
  const pass = types.includes(receivedType);
  if (!pass)
    throw new TypeError(`${name} value must be ${types.join(" or ")}, received "${receivedType}"`);
}
function stdout() {
  return console._stdout || process.stdout;
}
function random(seed) {
  const x = Math.sin(seed++) * 1e4;
  return x - Math.floor(x);
}
function shuffle(array, seed = RealDate.now()) {
  let length = array.length;
  while (length) {
    const index = Math.floor(random(seed) * length--);
    const previous = array[length];
    array[length] = array[index];
    array[index] = previous;
    ++seed;
  }
  return array;
}

function getTests(suite) {
  return toArray(suite).flatMap((s) => s.type === "test" ? [s] : s.tasks.flatMap((c) => c.type === "test" ? [c] : getTests(c)));
}
function getSuites(suite) {
  return toArray(suite).flatMap((s) => s.type === "suite" ? [s, ...getSuites(s.tasks)] : []);
}
function hasTests(suite) {
  return toArray(suite).some((s) => s.tasks.some((c) => c.type === "test" || hasTests(c)));
}
function hasFailed(suite) {
  return toArray(suite).some((s) => {
    var _a;
    return ((_a = s.result) == null ? void 0 : _a.state) === "fail" || s.type === "suite" && hasFailed(s.tasks);
  });
}
function hasFailedSnapshot(suite) {
  return getTests(suite).some((s) => {
    var _a, _b;
    const message = (_b = (_a = s.result) == null ? void 0 : _a.error) == null ? void 0 : _b.message;
    return message == null ? void 0 : message.match(/Snapshot .* mismatched/);
  });
}
function getNames(task) {
  const names = [task.name];
  let current = task;
  while ((current == null ? void 0 : current.suite) || (current == null ? void 0 : current.file)) {
    current = current.suite || current.file;
    if (current == null ? void 0 : current.name)
      names.unshift(current.name);
  }
  return names;
}

var _a;
const isNode = typeof process < "u" && typeof process.stdout < "u" && !((_a = process.versions) == null ? void 0 : _a.deno) && !globalThis.window;
const isBrowser = typeof window !== "undefined";
const isWindows = isNode && process.platform === "win32";
const relativePath = isBrowser ? relative : relative$1;
function partitionSuiteChildren(suite) {
  let tasksGroup = [];
  const tasksGroups = [];
  for (const c2 of suite.tasks) {
    if (tasksGroup.length === 0 || c2.concurrent === tasksGroup[0].concurrent) {
      tasksGroup.push(c2);
    } else {
      tasksGroups.push(tasksGroup);
      tasksGroup = [c2];
    }
  }
  if (tasksGroup.length > 0)
    tasksGroups.push(tasksGroup);
  return tasksGroups;
}
function resetModules(modules, resetMocks = false) {
  const skipPaths = [
    /\/vitest\/dist\//,
    /vitest-virtual-\w+\/dist/,
    /@vitest\/dist/,
    ...!resetMocks ? [/^mock:/] : []
  ];
  modules.forEach((_, path) => {
    if (skipPaths.some((re) => re.test(path)))
      return;
    modules.delete(path);
  });
}
function getFullName(task) {
  return getNames(task).join(picocolors.exports.dim(" > "));
}
async function ensurePackageInstalled(dependency, root) {
  if (isPackageExists(dependency, { paths: [root] }))
    return true;
  const promptInstall = !process.env.CI && process.stdout.isTTY;
  process.stderr.write(picocolors.exports.red(`${picocolors.exports.inverse(picocolors.exports.red(" MISSING DEP "))} Can not find dependency '${dependency}'

`));
  if (!promptInstall)
    return false;
  const prompts = await import('./vendor-index.ae96af6e.mjs').then(function (n) { return n.i; });
  const { install } = await prompts.prompt({
    type: "confirm",
    name: "install",
    message: picocolors.exports.reset(`Do you want to install ${picocolors.exports.green(dependency)}?`)
  });
  if (install) {
    await (await import('./chunk-install-pkg.3aa3eae6.mjs')).installPackage(dependency, { dev: true });
    process.stderr.write(picocolors.exports.yellow(`
Package ${dependency} installed, re-run the command to start.
`));
    process.exit(EXIT_CODE_RESTART);
    return true;
  }
  return false;
}
function getCallLastIndex(code) {
  let charIndex = -1;
  let inString = null;
  let startedBracers = 0;
  let endedBracers = 0;
  let beforeChar = null;
  while (charIndex <= code.length) {
    beforeChar = code[charIndex];
    charIndex++;
    const char = code[charIndex];
    const isCharString = char === '"' || char === "'" || char === "`";
    if (isCharString && beforeChar !== "\\") {
      if (inString === char)
        inString = null;
      else if (!inString)
        inString = char;
    }
    if (!inString) {
      if (char === "(")
        startedBracers++;
      if (char === ")")
        endedBracers++;
    }
    if (startedBracers && endedBracers && startedBracers === endedBracers)
      return charIndex;
  }
  return null;
}
isNode ? relative$1 : relative;
class AggregateErrorPonyfill extends Error {
  constructor(errors, message = "") {
    super(message);
    this.errors = [...errors];
  }
}

export { AggregateErrorPonyfill as A, stdout as B, isWindows as C, mergeSlashes as D, getAllMockableProperties as E, RealDate as R, resetModules as a, getNames as b, assertTypes as c, getFullName as d, notNullish as e, deepClone as f, getCallLastIndex as g, getType as h, isObject as i, isNode as j, relativePath as k, isBrowser as l, mockDate as m, noop as n, shuffle as o, partitionSuiteChildren as p, hasTests as q, resetDate as r, slash as s, toArray as t, hasFailed as u, getTests as v, hasFailedSnapshot as w, getSuites as x, deepMerge as y, ensurePackageInstalled as z };
