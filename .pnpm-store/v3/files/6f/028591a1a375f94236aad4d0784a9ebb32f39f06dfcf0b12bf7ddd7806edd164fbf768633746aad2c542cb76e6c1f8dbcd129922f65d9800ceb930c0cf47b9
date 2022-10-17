import Typeson from 'typeson';
import file from './file.js';

const filelist = {
    file: file.file,
    filelist: {
        test (x) { return Typeson.toStringTag(x) === 'FileList'; },
        replace (fl) {
            const arr = [];
            for (let i = 0; i < fl.length; i++) {
                arr[i] = fl.item(i);
            }
            return arr;
        },
        revive (o) {
            /**
             * `FileList` polyfill.
             */
            class FileList {
                /**
                 * Set private properties and length.
                 */
                constructor () {
                    // eslint-disable-next-line prefer-rest-params
                    this._files = arguments[0];
                    this.length = this._files.length;
                }
                /**
                 * @param {Integer} index
                 * @returns {File}
                 */
                item (index) {
                    return this._files[index];
                }
                /* eslint-disable class-methods-use-this */
                /**
                 * @returns {"FileList"}
                 */
                get [Symbol.toStringTag] () {
                    /* eslint-enable class-methods-use-this */
                    return 'FileList';
                }
            }
            return new FileList(o);
        }
    }
};

export default filelist;
