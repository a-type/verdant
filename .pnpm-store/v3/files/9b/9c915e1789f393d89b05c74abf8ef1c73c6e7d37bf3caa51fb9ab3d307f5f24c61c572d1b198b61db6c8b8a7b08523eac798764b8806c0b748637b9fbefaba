import { e as environments, t as takeCoverageInsideWorker, p as pLimit } from './chunk-integrations-coverage.d205bd87.mjs';
import { r as resetRunOnceCounter, i as index, v as vi } from './chunk-runtime-hooks.5d7073db.mjs';
import { f as deepClone, h as getType, j as isNode, R as RealDate, t as toArray, k as relativePath, l as isBrowser, p as partitionSuiteChildren, o as shuffle, q as hasTests, u as hasFailed, d as getFullName } from './chunk-mock-date.304e29b1.mjs';
import { e as clearCollectorContext, f as defaultSuite, h as setHooks, j as getHooks, k as collectorContext, l as setState, G as GLOBAL_EXPECT, m as getFn, n as getState } from './chunk-runtime-chain.be610650.mjs';
import { r as rpc } from './chunk-runtime-rpc.57586b73.mjs';
import util$1 from 'util';
import { util } from 'chai';
import { s as stringify } from './chunk-utils-source-map.bbf3ad19.mjs';
import { g as getWorkerState } from './chunk-utils-global.fa20c2f6.mjs';
import { a as safeClearTimeout, s as safeSetTimeout } from './chunk-utils-timers.b48455ed.mjs';

const OBJECT_PROTO = Object.getPrototypeOf({});
function serializeError(val, seen = /* @__PURE__ */ new WeakMap()) {
  if (!val || typeof val === "string")
    return val;
  if (typeof val === "function")
    return `Function<${val.name}>`;
  if (typeof val !== "object")
    return val;
  if (val instanceof Promise || "then" in val || val.constructor && val.constructor.prototype === "AsyncFunction")
    return "Promise";
  if (typeof Element !== "undefined" && val instanceof Element)
    return val.tagName;
  if (typeof val.asymmetricMatch === "function")
    return `${val.toString()} ${util$1.format(val.sample)}`;
  if (seen.has(val))
    return seen.get(val);
  if (Array.isArray(val)) {
    const clone = new Array(val.length);
    seen.set(val, clone);
    val.forEach((e, i) => {
      clone[i] = serializeError(e, seen);
    });
    return clone;
  } else {
    const clone = /* @__PURE__ */ Object.create(null);
    seen.set(val, clone);
    let obj = val;
    while (obj && obj !== OBJECT_PROTO) {
      Object.getOwnPropertyNames(obj).forEach((key) => {
        if (!(key in clone))
          clone[key] = serializeError(obj[key], seen);
      });
      obj = Object.getPrototypeOf(obj);
    }
    return clone;
  }
}
function normalizeErrorMessage(message) {
  return message.replace(/__vite_ssr_import_\d+__\./g, "");
}
function processError(err) {
  if (!err)
    return err;
  if (err.stack)
    err.stackStr = String(err.stack);
  if (err.name)
    err.nameStr = String(err.name);
  const clonedActual = deepClone(err.actual);
  const clonedExpected = deepClone(err.expected);
  const { replacedActual, replacedExpected } = replaceAsymmetricMatcher(clonedActual, clonedExpected);
  err.actual = replacedActual;
  err.expected = replacedExpected;
  if (typeof err.expected !== "string")
    err.expected = stringify(err.expected);
  if (typeof err.actual !== "string")
    err.actual = stringify(err.actual);
  try {
    if (typeof err.message === "string")
      err.message = normalizeErrorMessage(err.message);
    if (typeof err.cause === "object" && typeof err.cause.message === "string")
      err.cause.message = normalizeErrorMessage(err.cause.message);
  } catch {
  }
  try {
    return serializeError(err);
  } catch (e) {
    return serializeError(new Error(`Failed to fully serialize error: ${e == null ? void 0 : e.message}
Inner error message: ${err == null ? void 0 : err.message}`));
  }
}
function isAsymmetricMatcher(data) {
  const type = getType(data);
  return type === "Object" && typeof data.asymmetricMatch === "function";
}
function isReplaceable(obj1, obj2) {
  const obj1Type = getType(obj1);
  const obj2Type = getType(obj2);
  return obj1Type === obj2Type && obj1Type === "Object";
}
function replaceAsymmetricMatcher(actual, expected, actualReplaced = /* @__PURE__ */ new WeakMap(), expectedReplaced = /* @__PURE__ */ new WeakMap()) {
  if (!isReplaceable(actual, expected))
    return { replacedActual: actual, replacedExpected: expected };
  if (actualReplaced.has(actual) || expectedReplaced.has(expected))
    return { replacedActual: actual, replacedExpected: expected };
  actualReplaced.set(actual, true);
  expectedReplaced.set(expected, true);
  util.getOwnEnumerableProperties(expected).forEach((key) => {
    const expectedValue = expected[key];
    const actualValue = actual[key];
    if (isAsymmetricMatcher(expectedValue)) {
      if (expectedValue.asymmetricMatch(actualValue))
        actual[key] = expectedValue;
    } else if (isAsymmetricMatcher(actualValue)) {
      if (actualValue.asymmetricMatch(expectedValue))
        expected[key] = actualValue;
    } else if (isReplaceable(actualValue, expectedValue)) {
      const replaced = replaceAsymmetricMatcher(actualValue, expectedValue, actualReplaced, expectedReplaced);
      actual[key] = replaced.replacedActual;
      expected[key] = replaced.replacedExpected;
    }
  });
  return {
    replacedActual: actual,
    replacedExpected: expected
  };
}

let globalSetup = false;
async function setupGlobalEnv(config) {
  resetRunOnceCounter();
  Object.defineProperty(globalThis, "__vitest_index__", {
    value: index,
    enumerable: false
  });
  Error.stackTraceLimit = 100;
  setupDefines(config.defines);
  if (globalSetup)
    return;
  globalSetup = true;
  if (isNode)
    await setupConsoleLogSpy();
  if (config.globals)
    (await import('./chunk-integrations-globals.60af7da3.mjs')).registerApiGlobally();
}
function setupDefines(defines) {
  for (const key in defines)
    globalThis[key] = defines[key];
}
async function setupConsoleLogSpy() {
  const stdoutBuffer = /* @__PURE__ */ new Map();
  const stderrBuffer = /* @__PURE__ */ new Map();
  const timers = /* @__PURE__ */ new Map();
  const unknownTestId = "__vitest__unknown_test__";
  const { Writable } = await import('stream');
  const { Console } = await import('console');
  function schedule(taskId) {
    const timer = timers.get(taskId);
    const { stdoutTime, stderrTime } = timer;
    safeClearTimeout(timer.timer);
    timer.timer = safeSetTimeout(() => {
      if (stderrTime < stdoutTime) {
        sendStderr(taskId);
        sendStdout(taskId);
      } else {
        sendStdout(taskId);
        sendStderr(taskId);
      }
    });
  }
  function sendStdout(taskId) {
    const buffer = stdoutBuffer.get(taskId);
    if (!buffer)
      return;
    const content = buffer.map((i) => String(i)).join("");
    if (!content.trim())
      return;
    const timer = timers.get(taskId);
    rpc().onUserConsoleLog({
      type: "stdout",
      content,
      taskId,
      time: timer.stdoutTime || RealDate.now(),
      size: buffer.length
    });
    stdoutBuffer.set(taskId, []);
    timer.stdoutTime = 0;
  }
  function sendStderr(taskId) {
    const buffer = stderrBuffer.get(taskId);
    if (!buffer)
      return;
    const content = buffer.map((i) => String(i)).join("");
    if (!content.trim())
      return;
    const timer = timers.get(taskId);
    rpc().onUserConsoleLog({
      type: "stderr",
      content,
      taskId,
      time: timer.stderrTime || RealDate.now(),
      size: buffer.length
    });
    stderrBuffer.set(taskId, []);
    timer.stderrTime = 0;
  }
  const stdout = new Writable({
    write(data, encoding, callback) {
      var _a, _b;
      const id = ((_b = (_a = getWorkerState()) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
      let timer = timers.get(id);
      if (timer) {
        timer.stdoutTime = timer.stdoutTime || RealDate.now();
      } else {
        timer = { stdoutTime: RealDate.now(), stderrTime: RealDate.now(), timer: 0 };
        timers.set(id, timer);
      }
      let buffer = stdoutBuffer.get(id);
      if (!buffer) {
        buffer = [];
        stdoutBuffer.set(id, buffer);
      }
      buffer.push(data);
      schedule(id);
      callback();
    }
  });
  const stderr = new Writable({
    write(data, encoding, callback) {
      var _a, _b;
      const id = ((_b = (_a = getWorkerState()) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
      let timer = timers.get(id);
      if (timer) {
        timer.stderrTime = timer.stderrTime || RealDate.now();
      } else {
        timer = { stderrTime: RealDate.now(), stdoutTime: RealDate.now(), timer: 0 };
        timers.set(id, timer);
      }
      let buffer = stderrBuffer.get(id);
      if (!buffer) {
        buffer = [];
        stderrBuffer.set(id, buffer);
      }
      buffer.push(data);
      schedule(id);
      callback();
    }
  });
  globalThis.console = new Console({
    stdout,
    stderr,
    colorMode: true,
    groupIndentation: 2
  });
}
async function withEnv(name, options, fn) {
  const env = await environments[name].setup(globalThis, options);
  try {
    await fn();
  } finally {
    await env.teardown(globalThis);
  }
}
async function runSetupFiles(config) {
  const files = toArray(config.setupFiles);
  await Promise.all(files.map(async (fsPath) => {
    getWorkerState().moduleCache.delete(fsPath);
    await import(fsPath);
  }));
}

const now$1 = Date.now;
function hash(str) {
  let hash2 = 0;
  if (str.length === 0)
    return `${hash2}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash2 = (hash2 << 5) - hash2 + char;
    hash2 = hash2 & hash2;
  }
  return `${hash2}`;
}
async function collectTests(paths, config) {
  const files = [];
  const browserHashMap = getWorkerState().browserHashMap;
  async function importFromBrowser(filepath) {
    const match = filepath.match(/^(\w:\/)/);
    const hash2 = browserHashMap.get(filepath);
    if (match)
      return await import(`/@fs/${filepath.slice(match[1].length)}?v=${hash2}`);
    else
      return await import(`${filepath}?v=${hash2}`);
  }
  for (const filepath of paths) {
    const path = relativePath(config.root, filepath);
    const file = {
      id: hash(path),
      name: path,
      type: "suite",
      mode: "run",
      filepath,
      tasks: []
    };
    clearCollectorContext();
    try {
      const setupStart = now$1();
      await runSetupFiles(config);
      const collectStart = now$1();
      file.setupDuration = collectStart - setupStart;
      if (config.browser && isBrowser)
        await importFromBrowser(filepath);
      else
        await import(filepath);
      const defaultTasks = await defaultSuite.collect(file);
      setHooks(file, getHooks(defaultTasks));
      for (const c of [...defaultTasks.tasks, ...collectorContext.tasks]) {
        if (c.type === "test") {
          file.tasks.push(c);
        } else if (c.type === "suite") {
          file.tasks.push(c);
        } else {
          const suite = await c.collect(file);
          if (suite.name || suite.tasks.length)
            file.tasks.push(suite);
        }
      }
      file.collectDuration = now$1() - collectStart;
    } catch (e) {
      file.result = {
        state: "fail",
        error: processError(e)
      };
      if (config.browser)
        console.error(e);
    }
    calculateHash(file);
    const hasOnlyTasks = someTasksAreOnly(file);
    interpretTaskModes(file, config.testNamePattern, hasOnlyTasks, false, config.allowOnly);
    files.push(file);
  }
  return files;
}
function interpretTaskModes(suite, namePattern, onlyMode, parentIsOnly, allowOnly) {
  const suiteIsOnly = parentIsOnly || suite.mode === "only";
  suite.tasks.forEach((t) => {
    const includeTask = suiteIsOnly || t.mode === "only";
    if (onlyMode) {
      if (t.type === "suite" && (includeTask || someTasksAreOnly(t))) {
        if (t.mode === "only") {
          checkAllowOnly(t, allowOnly);
          t.mode = "run";
        }
      } else if (t.mode === "run" && !includeTask) {
        t.mode = "skip";
      } else if (t.mode === "only") {
        checkAllowOnly(t, allowOnly);
        t.mode = "run";
      }
    }
    if (t.type === "test") {
      if (namePattern && !getTaskFullName(t).match(namePattern))
        t.mode = "skip";
    } else if (t.type === "suite") {
      if (t.mode === "skip")
        skipAllTasks(t);
      else
        interpretTaskModes(t, namePattern, onlyMode, includeTask, allowOnly);
    }
  });
  if (suite.mode === "run") {
    if (suite.tasks.length && suite.tasks.every((i) => i.mode !== "run"))
      suite.mode = "skip";
  }
}
function getTaskFullName(task) {
  return `${task.suite ? `${getTaskFullName(task.suite)} ` : ""}${task.name}`;
}
function someTasksAreOnly(suite) {
  return suite.tasks.some((t) => t.mode === "only" || t.type === "suite" && someTasksAreOnly(t));
}
function skipAllTasks(suite) {
  suite.tasks.forEach((t) => {
    if (t.mode === "run") {
      t.mode = "skip";
      if (t.type === "suite")
        skipAllTasks(t);
    }
  });
}
function checkAllowOnly(task, allowOnly) {
  if (allowOnly)
    return;
  task.result = {
    state: "fail",
    error: processError(new Error("[Vitest] Unexpected .only modifier. Remove it or pass --allowOnly argument to bypass this error"))
  };
}
function calculateHash(parent) {
  parent.tasks.forEach((t, idx) => {
    t.id = `${parent.id}_${idx}`;
    if (t.type === "suite")
      calculateHash(t);
  });
}

const now = Date.now;
function updateSuiteHookState(suite, name, state) {
  var _a;
  if (!suite.result)
    suite.result = { state: "run" };
  if (!((_a = suite.result) == null ? void 0 : _a.hooks))
    suite.result.hooks = {};
  const suiteHooks = suite.result.hooks;
  if (suiteHooks) {
    suiteHooks[name] = state;
    updateTask(suite);
  }
}
async function callSuiteHook(suite, currentTask, name, args) {
  const callbacks = [];
  if (name === "beforeEach" && suite.suite) {
    callbacks.push(...await callSuiteHook(suite.suite, currentTask, name, args));
  }
  updateSuiteHookState(currentTask, name, "run");
  callbacks.push(...await Promise.all(getHooks(suite)[name].map((fn) => fn(...args))));
  updateSuiteHookState(currentTask, name, "pass");
  if (name === "afterEach" && suite.suite) {
    callbacks.push(...await callSuiteHook(suite.suite, currentTask, name, args));
  }
  return callbacks;
}
const packs = /* @__PURE__ */ new Map();
let updateTimer;
let previousUpdate;
function updateTask(task) {
  packs.set(task.id, task.result);
  safeClearTimeout(updateTimer);
  updateTimer = safeSetTimeout(() => {
    previousUpdate = sendTasksUpdate();
  }, 10);
}
async function sendTasksUpdate() {
  safeClearTimeout(updateTimer);
  await previousUpdate;
  if (packs.size) {
    const p = rpc().onTaskUpdate(Array.from(packs));
    packs.clear();
    return p;
  }
}
async function runTest(test) {
  var _a, _b;
  if (test.mode !== "run") {
    const { getSnapshotClient } = await import('./chunk-runtime-chain.be610650.mjs').then(function (n) { return n.p; });
    getSnapshotClient().skipTestSnapshots(test);
    return;
  }
  if (((_a = test.result) == null ? void 0 : _a.state) === "fail") {
    updateTask(test);
    return;
  }
  const start = now();
  test.result = {
    state: "run",
    startTime: start
  };
  updateTask(test);
  clearModuleMocks();
  if (isNode) {
    const { getSnapshotClient } = await import('./chunk-runtime-chain.be610650.mjs').then(function (n) { return n.p; });
    await getSnapshotClient().setTest(test);
  }
  const workerState = getWorkerState();
  workerState.current = test;
  let beforeEachCleanups = [];
  try {
    beforeEachCleanups = await callSuiteHook(test.suite, test, "beforeEach", [test.context, test.suite]);
    setState({
      assertionCalls: 0,
      isExpectingAssertions: false,
      isExpectingAssertionsError: null,
      expectedAssertionsNumber: null,
      expectedAssertionsNumberErrorGen: null,
      testPath: (_b = test.suite.file) == null ? void 0 : _b.filepath,
      currentTestName: getFullName(test)
    }, globalThis[GLOBAL_EXPECT]);
    await getFn(test)();
    const {
      assertionCalls,
      expectedAssertionsNumber,
      expectedAssertionsNumberErrorGen,
      isExpectingAssertions,
      isExpectingAssertionsError
    } = test.context._local ? test.context.expect.getState() : getState(globalThis[GLOBAL_EXPECT]);
    if (expectedAssertionsNumber !== null && assertionCalls !== expectedAssertionsNumber)
      throw expectedAssertionsNumberErrorGen();
    if (isExpectingAssertions === true && assertionCalls === 0)
      throw isExpectingAssertionsError;
    test.result.state = "pass";
  } catch (e) {
    test.result.state = "fail";
    test.result.error = processError(e);
  }
  try {
    await callSuiteHook(test.suite, test, "afterEach", [test.context, test.suite]);
    await Promise.all(beforeEachCleanups.map((i) => i == null ? void 0 : i()));
  } catch (e) {
    test.result.state = "fail";
    test.result.error = processError(e);
  }
  if (test.fails) {
    if (test.result.state === "pass") {
      test.result.state = "fail";
      test.result.error = processError(new Error("Expect test to fail"));
    } else {
      test.result.state = "pass";
      test.result.error = void 0;
    }
  }
  if (isBrowser && test.result.error)
    console.error(test.result.error.message, test.result.error.stackStr);
  if (isNode) {
    const { getSnapshotClient } = await import('./chunk-runtime-chain.be610650.mjs').then(function (n) { return n.p; });
    getSnapshotClient().clearTest();
  }
  test.result.duration = now() - start;
  if (workerState.config.logHeapUsage && isNode)
    test.result.heap = process.memoryUsage().heapUsed;
  workerState.current = void 0;
  updateTask(test);
}
function markTasksAsSkipped(suite) {
  suite.tasks.forEach((t) => {
    t.mode = "skip";
    t.result = { ...t.result, state: "skip" };
    updateTask(t);
    if (t.type === "suite")
      markTasksAsSkipped(t);
  });
}
async function runSuite(suite) {
  var _a;
  if (((_a = suite.result) == null ? void 0 : _a.state) === "fail") {
    markTasksAsSkipped(suite);
    updateTask(suite);
    return;
  }
  const start = now();
  suite.result = {
    state: "run",
    startTime: start
  };
  updateTask(suite);
  const workerState = getWorkerState();
  if (suite.mode === "skip") {
    suite.result.state = "skip";
  } else if (suite.mode === "todo") {
    suite.result.state = "todo";
  } else {
    try {
      const beforeAllCleanups = await callSuiteHook(suite, suite, "beforeAll", [suite]);
      for (let tasksGroup of partitionSuiteChildren(suite)) {
        if (tasksGroup[0].concurrent === true) {
          const mutex = pLimit(workerState.config.maxConcurrency);
          await Promise.all(tasksGroup.map((c) => mutex(() => runSuiteChild(c))));
        } else {
          const { sequence } = workerState.config;
          if (sequence.shuffle || suite.shuffle) {
            const suites = tasksGroup.filter((group) => group.type === "suite");
            const tests = tasksGroup.filter((group) => group.type === "test");
            const groups = shuffle([suites, tests], sequence.seed);
            tasksGroup = groups.flatMap((group) => shuffle(group, sequence.seed));
          }
          for (const c of tasksGroup)
            await runSuiteChild(c);
        }
      }
      await callSuiteHook(suite, suite, "afterAll", [suite]);
      await Promise.all(beforeAllCleanups.map((i) => i == null ? void 0 : i()));
    } catch (e) {
      suite.result.state = "fail";
      suite.result.error = processError(e);
    }
  }
  suite.result.duration = now() - start;
  if (workerState.config.logHeapUsage && isNode)
    suite.result.heap = process.memoryUsage().heapUsed;
  if (suite.mode === "run") {
    if (!hasTests(suite)) {
      suite.result.state = "fail";
      if (!suite.result.error)
        suite.result.error = new Error(`No test found in suite ${suite.name}`);
    } else if (hasFailed(suite)) {
      suite.result.state = "fail";
    } else {
      suite.result.state = "pass";
    }
  }
  updateTask(suite);
}
async function runSuiteChild(c) {
  return c.type === "test" ? runTest(c) : runSuite(c);
}
async function runSuites(suites) {
  for (const suite of suites)
    await runSuite(suite);
}
async function runFiles(files, config) {
  var _a;
  for (const file of files) {
    if (!file.tasks.length && !config.passWithNoTests) {
      if (!((_a = file.result) == null ? void 0 : _a.error)) {
        file.result = {
          state: "fail",
          error: new Error(`No test suite found in file ${file.filepath}`)
        };
      }
    }
    await runSuite(file);
  }
}
async function startTestsBrowser(paths, config) {
  if (isNode) {
    rpc().onPathsCollected(paths);
  } else {
    const files = await collectTests(paths, config);
    await rpc().onCollected(files);
    await runSuites(files);
    await sendTasksUpdate();
  }
}
async function startTestsNode(paths, config) {
  const files = await collectTests(paths, config);
  rpc().onCollected(files);
  const { getSnapshotClient } = await import('./chunk-runtime-chain.be610650.mjs').then(function (n) { return n.p; });
  getSnapshotClient().clear();
  await runFiles(files, config);
  const coverage = await takeCoverageInsideWorker(config.coverage);
  rpc().onAfterSuiteRun({ coverage });
  await getSnapshotClient().saveCurrent();
  await sendTasksUpdate();
}
async function startTests(paths, config) {
  if (config.browser)
    return startTestsBrowser(paths, config);
  else
    return startTestsNode(paths, config);
}
function clearModuleMocks() {
  const { clearMocks, mockReset, restoreMocks } = getWorkerState().config;
  if (restoreMocks)
    vi.restoreAllMocks();
  else if (mockReset)
    vi.resetAllMocks();
  else if (clearMocks)
    vi.clearAllMocks();
}

export { setupGlobalEnv as a, startTests as s, withEnv as w };
