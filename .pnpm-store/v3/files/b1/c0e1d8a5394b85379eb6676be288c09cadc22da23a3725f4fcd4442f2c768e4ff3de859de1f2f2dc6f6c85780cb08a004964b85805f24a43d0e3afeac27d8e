/* globals XMLHttpRequest, File, FileReader */
import Typeson from 'typeson';
import {string2arraybuffer} from '../utils/stringArrayBuffer.js';

const file = {
    file: {
        test (x) { return Typeson.toStringTag(x) === 'File'; },
        replace (f) { // Sync
            const req = new XMLHttpRequest();
            req.overrideMimeType('text/plain; charset=x-user-defined');
            req.open('GET', URL.createObjectURL(f), false); // Sync
            req.send();

            // Seems not feasible to accurately simulate
            /* istanbul ignore next */
            if (req.status !== 200 && req.status !== 0) {
                throw new Error('Bad File access: ' + req.status);
            }
            return {
                type: f.type,
                stringContents: req.responseText,
                name: f.name,
                lastModified: f.lastModified
            };
        },
        revive ({name, type, stringContents, lastModified}) {
            return new File([string2arraybuffer(stringContents)], name, {
                type,
                lastModified
            });
        },
        replaceAsync (f) {
            return new Typeson.Promise(function (resolve, reject) {
                /*
                if (f.isClosed) { // On MDN, but not in https://w3c.github.io/FileAPI/#dfn-Blob
                    reject(new Error('The File is closed'));
                    return;
                }
                */
                const reader = new FileReader();
                reader.addEventListener('load', function () {
                    resolve({
                        type: f.type,
                        stringContents: reader.result,
                        name: f.name,
                        lastModified: f.lastModified
                    });
                });
                // Seems not feasible to accurately simulate
                /* istanbul ignore next */
                reader.addEventListener('error', function () {
                    reject(reader.error);
                });
                reader.readAsBinaryString(f);
            });
        }
    }
};

export default file;
