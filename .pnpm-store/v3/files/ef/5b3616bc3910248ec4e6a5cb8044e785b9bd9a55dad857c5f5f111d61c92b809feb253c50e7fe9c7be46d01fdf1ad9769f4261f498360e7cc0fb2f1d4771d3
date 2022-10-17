import { existsSync, promises } from 'fs';
import { a as resolve, p as picocolors, j as join } from './chunk-constants.71e8a211.mjs';
import 'tty';
import 'url';
import 'path';

function hashCode(s) {
  return s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}
class Debugger {
  constructor(root, options) {
    this.options = options;
    this.externalizeMap = /* @__PURE__ */ new Map();
    if (options.dumpModules)
      this.dumpDir = resolve(root, options.dumpModules === true ? ".vite-node/dump" : options.dumpModules);
    if (this.dumpDir) {
      if (options.loadDumppedModules)
        console.info(picocolors.exports.gray(`[vite-node] [debug] load modules from ${this.dumpDir}`));
      else
        console.info(picocolors.exports.gray(`[vite-node] [debug] dump modules to ${this.dumpDir}`));
    }
    this.initPromise = this.clearDump();
  }
  async clearDump() {
    if (!this.dumpDir)
      return;
    if (!this.options.loadDumppedModules && existsSync(this.dumpDir))
      await promises.rm(this.dumpDir, { recursive: true, force: true });
    await promises.mkdir(this.dumpDir, { recursive: true });
  }
  encodeId(id) {
    return `${id.replace(/[^\w@_-]/g, "_").replace(/_+/g, "_")}-${hashCode(id)}.js`;
  }
  async recordExternalize(id, path) {
    if (!this.dumpDir)
      return;
    this.externalizeMap.set(id, path);
    await this.writeInfo();
  }
  async dumpFile(id, result) {
    if (!result || !this.dumpDir)
      return;
    await this.initPromise;
    const name = this.encodeId(id);
    return await promises.writeFile(join(this.dumpDir, name), `// ${id.replace(/\0/g, "\\0")}
${result.code}`, "utf-8");
  }
  async loadDump(id) {
    if (!this.dumpDir)
      return null;
    await this.initPromise;
    const name = this.encodeId(id);
    const path = join(this.dumpDir, name);
    if (!existsSync(path))
      return null;
    const code = await promises.readFile(path, "utf-8");
    return {
      code: code.replace(/^\/\/.*?\n/, ""),
      map: void 0
    };
  }
  async writeInfo() {
    if (!this.dumpDir)
      return;
    const info = JSON.stringify({
      time: new Date().toLocaleString(),
      externalize: Object.fromEntries(this.externalizeMap.entries())
    }, null, 2);
    return promises.writeFile(join(this.dumpDir, "info.json"), info, "utf-8");
  }
}

export { Debugger };
