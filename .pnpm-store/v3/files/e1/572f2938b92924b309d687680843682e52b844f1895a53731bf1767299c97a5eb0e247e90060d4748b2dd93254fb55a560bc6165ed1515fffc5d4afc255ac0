/* globals crypto */
import Typeson from 'typeson';

const cryptokey = {
    cryptokey: {
        test (x) {
            return Typeson.toStringTag(x) === 'CryptoKey' && x.extractable;
        },
        replaceAsync (key) {
            return new Typeson.Promise((resolve, reject) => {
                // eslint-disable-next-line promise/catch-or-return
                crypto.subtle.exportKey('jwk', key).catch(
                    /* eslint-disable promise/prefer-await-to-callbacks */
                    // istanbul ignore next
                    (err) => {
                        /* eslint-enable promise/prefer-await-to-callbacks */
                        // eslint-disable-next-line max-len
                        // istanbul ignore next -- Our format should be valid and our key extractable
                        reject(err);
                    }
                // eslint-disable-next-line max-len
                // eslint-disable-next-line promise/always-return, promise/prefer-await-to-then
                ).then((jwk) => {
                    resolve({
                        jwk,
                        algorithm: key.algorithm,
                        usages: key.usages
                    });
                });
            });
        },
        revive ({jwk, algorithm, usages}) {
            return crypto.subtle.importKey('jwk', jwk, algorithm, true, usages);
        }
    }
};

export default cryptokey;
