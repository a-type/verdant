/* globals DOMException */
import structuredCloning from './structured-cloning.js';

export default structuredCloning.concat({
    checkDataCloneException: {
        test (val) {
            // Should also throw with:
            // 1. `IsDetachedBuffer` (a process not called within the
            //      ECMAScript spec)
            // 2. `IsCallable` (covered by `typeof === 'function'` or a
            //       function's `toStringTag`)
            // 3. internal slots besides [[Prototype]] or [[Extensible]] (e.g.,
            //        [[PromiseState]] or [[WeakMapData]])
            // 4. exotic object (e.g., `Proxy`) (unless an `%ObjectPrototype%`
            //      intrinsic object) (which does not have default
            //      behavior for one or more of the essential internal methods
            //      that are limited to the following for non-function objects
            //      (we auto-exclude functions):
            //      [[GetPrototypeOf]],[[SetPrototypeOf]],[[IsExtensible]],
            //      [[PreventExtensions]],[[GetOwnProperty]],
            //      [[DefineOwnProperty]],[[HasProperty]],
            //      [[Get]],[[Set]],[[Delete]],[[OwnPropertyKeys]]);
            //      except for the standard, built-in exotic objects, we'd need
            //      to know whether these methods had distinct behaviors
            // Note: There is no apparent way for us to detect a `Proxy` and
            //      reject (Chrome at least is not rejecting anyways)
            const stringTag = ({}.toString.call(val).slice(8, -1));
            if (
                [
                    // Symbol's `toStringTag` is only "Symbol" for its initial
                    //   value, so we check `typeof`
                    'symbol',
                    // All functions including bound function exotic objects
                    'function'
                ].includes(typeof val) ||
                [
                    // A non-array exotic object
                    'Arguments',
                    // A non-array exotic object
                    'Module',
                    // `Error` and other errors have the [[ErrorData]] internal
                    //    slot and give "Error"
                    'Error',
                    // Promise instances have an extra slot ([[PromiseState]])
                    //    but not throwing in Chrome `postMessage`
                    'Promise',
                    // WeakMap instances have an extra slot ([[WeakMapData]])
                    //    but not throwing in Chrome `postMessage`
                    'WeakMap',
                    // WeakSet instances have an extra slot ([[WeakSetData]])
                    //    but not throwing in Chrome `postMessage`
                    'WeakSet',

                    // HTML-SPECIFIC
                    'Event',
                    // Also in Node `worker_threads` (currently experimental)
                    'MessageChannel'
                ].includes(stringTag) ||
                /*
                // isClosed is no longer documented
                ((stringTag === 'Blob' || stringTag === 'File') &&
                    val.isClosed) ||
                */
                (val && typeof val === 'object' &&
                    // Duck-type DOM node objects (non-array exotic?
                    //    objects which cannot be cloned by the SCA)
                    typeof val.nodeType === 'number' &&
                    typeof val.insertBefore === 'function')
            ) {
                throw new DOMException(
                    'The object cannot be cloned.', 'DataCloneError'
                );
            }
            return false;
        }
    }
});
