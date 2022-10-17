import { a as resolve, c as distDir } from './chunk-constants.71e8a211.mjs';
import { c as createBirpc, M as ModuleCacheMap } from './chunk-vite-node-client.cddda63d.mjs';
import { workerId } from 'tinypool';
import './chunk-mock-date.304e29b1.mjs';
import { e as executeInViteNode } from './chunk-runtime-mocker.49d21aa6.mjs';
import { r as rpc } from './chunk-runtime-rpc.57586b73.mjs';
import { g as getWorkerState } from './chunk-utils-global.fa20c2f6.mjs';
import 'tty';
import 'url';
import 'path';
import 'module';
import 'vm';
import './chunk-vite-node-utils.b432150c.mjs';
import 'fs';
import 'assert';
import 'util';
import 'debug';
import 'local-pkg';
import 'vite';
import './chunk-utils-timers.b48455ed.mjs';

let _viteNode;
const moduleCache = new ModuleCacheMap();
const mockMap = /* @__PURE__ */ new Map();
async function startViteNode(ctx) {
  if (_viteNode)
    return _viteNode;
  const processExit = process.exit;
  process.on("beforeExit", (code) => {
    rpc().onWorkerExit(code);
  });
  process.exit = (code = process.exitCode || 0) => {
    rpc().onWorkerExit(code);
    return processExit(code);
  };
  process.on("unhandledRejection", (err) => {
    rpc().onUnhandledRejection(err);
  });
  const { config } = ctx;
  const { run: run2 } = (await executeInViteNode({
    files: [
      resolve(distDir, "entry.mjs")
    ],
    fetchModule(id) {
      return rpc().fetch(id);
    },
    resolveId(id, importer) {
      return rpc().resolveId(id, importer);
    },
    moduleCache,
    mockMap,
    interopDefault: config.deps.interopDefault ?? true,
    root: config.root,
    base: config.base
  }))[0];
  _viteNode = { run: run2 };
  return _viteNode;
}
function init(ctx) {
  if (typeof __vitest_worker__ !== "undefined" && ctx.config.threads && ctx.config.isolate)
    throw new Error(`worker for ${ctx.files.join(",")} already initialized by ${getWorkerState().ctx.files.join(",")}. This is probably an internal bug of Vitest.`);
  const { config, port, workerId: workerId$1 } = ctx;
  process.env.VITEST_WORKER_ID = String(workerId$1);
  process.env.VITEST_POOL_ID = String(workerId);
  globalThis.__vitest_worker__ = {
    ctx,
    moduleCache,
    config,
    mockMap,
    rpc: createBirpc({}, {
      eventNames: ["onUserConsoleLog", "onFinished", "onCollected", "onWorkerExit"],
      post(v) {
        port.postMessage(v);
      },
      on(fn) {
        port.addListener("message", fn);
      }
    })
  };
  if (ctx.invalidates) {
    ctx.invalidates.forEach((fsPath) => {
      moduleCache.delete(fsPath);
      moduleCache.delete(`mock:${fsPath}`);
    });
  }
  ctx.files.forEach((i) => moduleCache.delete(i));
}
async function run(ctx) {
  init(ctx);
  const { run: run2 } = await startViteNode(ctx);
  return run2(ctx.files, ctx.config);
}

export { run };
