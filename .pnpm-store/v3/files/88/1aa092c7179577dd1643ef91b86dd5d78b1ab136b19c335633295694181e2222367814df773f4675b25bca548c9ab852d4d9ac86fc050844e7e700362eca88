import { SpyImpl } from 'tinyspy';
import { k as SuiteAPI, j as TestAPI, m as SuiteHooks, H as HookListener, q as TestContext, S as Suite, l as HookCleanupCallback, g as Test } from './global-fe52f84b.js';

interface MockResultReturn<T> {
    type: 'return';
    value: T;
}
interface MockResultIncomplete {
    type: 'incomplete';
    value: undefined;
}
interface MockResultThrow {
    type: 'throw';
    value: any;
}
declare type MockResult<T> = MockResultReturn<T> | MockResultThrow | MockResultIncomplete;
interface MockContext<TArgs, TReturns> {
    calls: TArgs[];
    instances: TReturns[];
    invocationCallOrder: number[];
    results: MockResult<TReturns>[];
    lastCall: TArgs | undefined;
}
declare type Procedure = (...args: any[]) => any;
declare type Methods<T> = {
    [K in keyof T]: T[K] extends Procedure ? K : never;
}[keyof T] & (string | symbol);
declare type Properties<T> = {
    [K in keyof T]: T[K] extends Procedure ? never : K;
}[keyof T] & (string | symbol);
declare type Classes<T> = {
    [K in keyof T]: T[K] extends new (...args: any[]) => any ? K : never;
}[keyof T] & (string | symbol);
interface SpyInstance<TArgs extends any[] = any[], TReturns = any> {
    getMockName(): string;
    mockName(n: string): this;
    mock: MockContext<TArgs, TReturns>;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    getMockImplementation(): ((...args: TArgs) => TReturns) | undefined;
    mockImplementation(fn: ((...args: TArgs) => TReturns) | (() => Promise<TReturns>)): this;
    mockImplementationOnce(fn: ((...args: TArgs) => TReturns) | (() => Promise<TReturns>)): this;
    mockReturnThis(): this;
    mockReturnValue(obj: TReturns): this;
    mockReturnValueOnce(obj: TReturns): this;
    mockResolvedValue(obj: Awaited<TReturns>): this;
    mockResolvedValueOnce(obj: Awaited<TReturns>): this;
    mockRejectedValue(obj: any): this;
    mockRejectedValueOnce(obj: any): this;
}
interface MockInstance<A extends any[] = any[], R = any> extends SpyInstance<A, R> {
}
interface Mock<TArgs extends any[] = any, TReturns = any> extends SpyInstance<TArgs, TReturns> {
    new (...args: TArgs): TReturns;
    (...args: TArgs): TReturns;
}
interface PartialMock<TArgs extends any[] = any, TReturns = any> extends SpyInstance<TArgs, Partial<TReturns>> {
    new (...args: TArgs): TReturns;
    (...args: TArgs): TReturns;
}
declare type MaybeMockedConstructor<T> = T extends new (...args: Array<any>) => infer R ? Mock<ConstructorParameters<T>, R> : T;
declare type MockedFunction<T extends Procedure> = Mock<Parameters<T>, ReturnType<T>> & {
    [K in keyof T]: T[K];
};
declare type PartiallyMockedFunction<T extends Procedure> = PartialMock<Parameters<T>, ReturnType<T>> & {
    [K in keyof T]: T[K];
};
declare type MockedFunctionDeep<T extends Procedure> = Mock<Parameters<T>, ReturnType<T>> & MockedObjectDeep<T>;
declare type PartiallyMockedFunctionDeep<T extends Procedure> = PartialMock<Parameters<T>, ReturnType<T>> & MockedObjectDeep<T>;
declare type MockedObject<T> = MaybeMockedConstructor<T> & {
    [K in Methods<T>]: T[K] extends Procedure ? MockedFunction<T[K]> : T[K];
} & {
    [K in Properties<T>]: T[K];
};
declare type MockedObjectDeep<T> = MaybeMockedConstructor<T> & {
    [K in Methods<T>]: T[K] extends Procedure ? MockedFunctionDeep<T[K]> : T[K];
} & {
    [K in Properties<T>]: MaybeMockedDeep<T[K]>;
};
declare type MaybeMockedDeep<T> = T extends Procedure ? MockedFunctionDeep<T> : T extends object ? MockedObjectDeep<T> : T;
declare type MaybePartiallyMockedDeep<T> = T extends Procedure ? PartiallyMockedFunctionDeep<T> : T extends object ? MockedObjectDeep<T> : T;
declare type MaybeMocked<T> = T extends Procedure ? MockedFunction<T> : T extends object ? MockedObject<T> : T;
declare type MaybePartiallyMocked<T> = T extends Procedure ? PartiallyMockedFunction<T> : T extends object ? MockedObject<T> : T;
interface Constructable {
    new (...args: any[]): any;
}
declare type MockedClass<T extends Constructable> = MockInstance<T extends new (...args: infer P) => any ? P : never, InstanceType<T>> & {
    prototype: T extends {
        prototype: any;
    } ? Mocked<T['prototype']> : never;
} & T;
declare type Mocked<T> = {
    [P in keyof T]: T[P] extends (...args: infer Args) => infer Returns ? MockInstance<Args, Returns> : T[P] extends Constructable ? MockedClass<T[P]> : T[P];
} & T;
declare type EnhancedSpy<TArgs extends any[] = any[], TReturns = any> = SpyInstance<TArgs, TReturns> & SpyImpl<TArgs, TReturns>;
declare function spyOn<T, S extends Properties<Required<T>>>(obj: T, methodName: S, accessType: 'get'): SpyInstance<[], T[S]>;
declare function spyOn<T, G extends Properties<Required<T>>>(obj: T, methodName: G, accessType: 'set'): SpyInstance<[T[G]], void>;
declare function spyOn<T, M extends (Methods<Required<T>> | Classes<Required<T>>)>(obj: T, methodName: M): Required<T>[M] extends (...args: infer A) => infer R | (new (...args: infer A) => infer R) ? SpyInstance<A, R> : never;
declare function fn<TArgs extends any[] = any[], R = any>(): Mock<TArgs, R>;
declare function fn<TArgs extends any[] = any[], R = any>(implementation: (...args: TArgs) => R): Mock<TArgs, R>;

declare const suite: SuiteAPI<{}>;
declare const test: TestAPI<{}>;
declare const describe: SuiteAPI<{}>;
declare const it: TestAPI<{}>;

declare const beforeAll: (fn: SuiteHooks['beforeAll'][0], timeout?: number) => void;
declare const afterAll: (fn: SuiteHooks['afterAll'][0], timeout?: number) => void;
declare const beforeEach: <ExtraContext = {}>(fn: HookListener<[TestContext & ExtraContext, Suite], HookCleanupCallback>, timeout?: number) => void;
declare const afterEach: <ExtraContext = {}>(fn: HookListener<[TestContext & ExtraContext, Suite], void>, timeout?: number) => void;

declare function createExpect(test?: Test): Vi.ExpectStatic;
declare const globalExpect: Vi.ExpectStatic;

export { EnhancedSpy as E, MaybeMockedDeep as M, SpyInstance as S, MaybeMocked as a, MaybePartiallyMocked as b, MaybePartiallyMockedDeep as c, suite as d, describe as e, fn as f, beforeAll as g, afterAll as h, it as i, beforeEach as j, afterEach as k, globalExpect as l, createExpect as m, MockedFunction as n, MockedObject as o, MockInstance as p, Mock as q, MockContext as r, spyOn as s, test as t, Mocked as u, MockedClass as v };
