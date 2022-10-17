import { UserConfig as UserConfig$2, ConfigEnv } from 'vite';
export { ConfigEnv } from 'vite';
import { U as UserConfig$1, a9 as ResolvedCoverageOptions, F as FakeTimerInstallOpts } from './global-fe52f84b.js';
import 'worker_threads';
import 'fs';

declare const defaultInclude: string[];
declare const defaultExclude: string[];
declare const config: {
    allowOnly: boolean;
    watch: boolean;
    globals: boolean;
    environment: "node";
    threads: boolean;
    clearMocks: boolean;
    restoreMocks: boolean;
    mockReset: boolean;
    include: string[];
    exclude: string[];
    testTimeout: number;
    hookTimeout: number;
    teardownTimeout: number;
    isolate: boolean;
    watchExclude: string[];
    forceRerunTriggers: string[];
    update: boolean;
    reporters: never[];
    silent: boolean;
    api: boolean;
    ui: boolean;
    uiBase: string;
    open: boolean;
    css: {
        include: RegExp[];
    };
    coverage: ResolvedCoverageOptions;
    fakeTimers: FakeTimerInstallOpts;
    maxConcurrency: number;
    dangerouslyIgnoreUnhandledErrors: boolean;
};
declare const configDefaults: Required<Pick<UserConfig$1, keyof typeof config>>;

interface UserConfig extends UserConfig$2 {
    test?: UserConfig$2['test'];
}

declare type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>;
declare type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn;
declare function defineConfig(config: UserConfigExport): UserConfigExport;

export { UserConfig, UserConfigExport, UserConfigFn, configDefaults, defaultExclude, defaultInclude, defineConfig };
