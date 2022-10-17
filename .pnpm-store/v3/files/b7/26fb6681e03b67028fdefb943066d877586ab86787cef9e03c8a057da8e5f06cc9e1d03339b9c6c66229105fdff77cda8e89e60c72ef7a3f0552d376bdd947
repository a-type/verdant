import { promises } from 'fs';
import { a as resetModules } from './chunk-mock-date.304e29b1.mjs';
import { b as envs } from './chunk-integrations-coverage.d205bd87.mjs';
import { a as setupGlobalEnv, s as startTests, w as withEnv } from './chunk-runtime-error.1104e45a.mjs';
import { g as getWorkerState } from './chunk-utils-global.fa20c2f6.mjs';
import 'path';
import './chunk-constants.71e8a211.mjs';
import 'tty';
import 'url';
import 'local-pkg';
import './chunk-runtime-hooks.5d7073db.mjs';
import './chunk-runtime-chain.be610650.mjs';
import 'util';
import 'chai';
import './vendor-_commonjsHelpers.4da45ef5.mjs';
import './chunk-runtime-rpc.57586b73.mjs';
import './chunk-utils-timers.b48455ed.mjs';
import './chunk-utils-source-map.bbf3ad19.mjs';
import './spy.mjs';
import 'tinyspy';

async function run(files, config) {
  await setupGlobalEnv(config);
  const workerState = getWorkerState();
  if (config.browser) {
    workerState.mockMap.clear();
    await startTests(files, config);
    return;
  }
  const filesWithEnv = await Promise.all(files.map(async (file) => {
    var _a;
    const code = await promises.readFile(file, "utf-8");
    const env = ((_a = code.match(/@(?:vitest|jest)-environment\s+?([\w-]+)\b/)) == null ? void 0 : _a[1]) || config.environment || "node";
    if (!envs.includes(env))
      throw new Error(`Unsupported environment: "${env}" in ${file}`);
    return {
      file,
      env
    };
  }));
  const filesByEnv = filesWithEnv.reduce((acc, { file, env }) => {
    acc[env] || (acc[env] = []);
    acc[env].push(file);
    return acc;
  }, {});
  for (const env of envs) {
    const environment = env;
    const files2 = filesByEnv[environment];
    if (!files2 || !files2.length)
      continue;
    await withEnv(environment, config.environmentOptions || {}, async () => {
      for (const file of files2) {
        workerState.mockMap.clear();
        resetModules(workerState.moduleCache, true);
        workerState.filepath = file;
        await startTests([file], config);
        workerState.filepath = void 0;
      }
    });
  }
}

export { run };
