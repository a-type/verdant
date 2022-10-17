import { k as globalApis } from './chunk-constants.71e8a211.mjs';
import { i as index } from './chunk-runtime-hooks.5d7073db.mjs';
import 'tty';
import 'url';
import 'path';
import './chunk-runtime-chain.be610650.mjs';
import 'util';
import './chunk-mock-date.304e29b1.mjs';
import 'local-pkg';
import 'chai';
import './vendor-_commonjsHelpers.4da45ef5.mjs';
import './chunk-runtime-rpc.57586b73.mjs';
import './chunk-utils-global.fa20c2f6.mjs';
import './chunk-utils-timers.b48455ed.mjs';
import 'fs';
import './chunk-utils-source-map.bbf3ad19.mjs';
import './spy.mjs';
import 'tinyspy';

function registerApiGlobally() {
  globalApis.forEach((api) => {
    globalThis[api] = index[api];
  });
}

export { registerApiGlobally };
