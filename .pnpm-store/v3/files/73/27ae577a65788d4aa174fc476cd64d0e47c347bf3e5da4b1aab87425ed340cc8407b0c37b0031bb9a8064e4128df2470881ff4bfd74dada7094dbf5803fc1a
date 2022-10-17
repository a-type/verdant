/**
* @callback TypesonFulfilled
* @returns {Promise<any>|any}
*/

/**
* @callback TypesonRejected
* @returns {Promise<any>|any}
*/

/**
 * @callback TypesonResolve
 * @param {any} value
 * @returns {Promise<any>}
 */

/**
 * @callback TypesonReject
 * @param {Error|any} error
 * @returns {Promise<any>}
 */

/**
 * @callback TypesonResolveReject
 * @param {TypesonResolve} typesonResolve
 * @param {TypesonReject} typesonReject
 * @returns {Promise<any>}
 */

/* eslint-disable block-spacing, space-before-function-paren,
  space-before-blocks, space-infix-ops, semi, promise/avoid-new,
  jsdoc/require-jsdoc */
/**
 * We keep this function minimized so if using two instances of this
 *   library, where one is minimized and one is not, it will still work
 *   with `hasConstructorOf`.
 * With ES6 classes, we may be able to simply use `class TypesonPromise
 *   extends Promise` and add a string tag for detection.
 * @param {TypesonResolveReject} f
 */
class TypesonPromise{constructor(f){this.p=new Promise(f)}}
/* eslint-enable block-spacing, space-before-function-paren,
  space-before-blocks, space-infix-ops, semi, promise/avoid-new,
  jsdoc/require-jsdoc */

// eslint-disable-next-line max-len
// class TypesonPromise extends Promise {get[Symbol.toStringTag](){return 'TypesonPromise'};} // eslint-disable-line keyword-spacing, space-before-function-paren, space-before-blocks, block-spacing, semi

TypesonPromise.__typeson__type__ = 'TypesonPromise';

// Note: core-js-bundle provides a `Symbol` polyfill
/* istanbul ignore else */
if (typeof Symbol !== 'undefined') {
    // Ensure `isUserObject` will return `false` for `TypesonPromise`
    TypesonPromise.prototype[Symbol.toStringTag] = 'TypesonPromise';
}

/**
 *
 * @param {TypesonFulfilled} [onFulfilled]
 * @param {TypesonRejected} [onRejected]
 * @returns {TypesonPromise}
 */
TypesonPromise.prototype.then = function (onFulfilled, onRejected) {
    return new TypesonPromise((typesonResolve, typesonReject) => {
        // eslint-disable-next-line promise/catch-or-return
        this.p.then(function (res) {
            // eslint-disable-next-line promise/always-return
            typesonResolve(onFulfilled ? onFulfilled(res) : res);
        }).catch(function (res) {
            return onRejected ? onRejected(res) : Promise.reject(res);
        }).then(typesonResolve, typesonReject);
    });
};

/**
 *
 * @param {TypesonRejected} onRejected
 * @returns {TypesonPromise}
 */
TypesonPromise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
};
/**
 *
 * @param {any} v
 * @returns {TypesonPromise}
 */
TypesonPromise.resolve = function (v) {
    return new TypesonPromise((typesonResolve) => {
        typesonResolve(v);
    });
};
/**
 *
 * @param {any} v
 * @returns {TypesonPromise}
 */
TypesonPromise.reject = function (v) {
    return new TypesonPromise((typesonResolve, typesonReject) => {
        typesonReject(v);
    });
};
['all', 'race', 'allSettled'].forEach(function (meth) {
    /**
     *
     * @param {Promise<any>[]} promArr
     * @returns {TypesonPromise}
     */
    TypesonPromise[meth] = function (promArr) {
        return new TypesonPromise(function (typesonResolve, typesonReject) {
            // eslint-disable-next-line promise/catch-or-return
            Promise[meth](promArr.map((prom) => {
                return prom && prom.constructor &&
                    prom.constructor.__typeson__type__ === 'TypesonPromise'
                    ? prom.p
                    : prom;
            })).then(typesonResolve, typesonReject);
        });
    };
});

export {TypesonPromise};
