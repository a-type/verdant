/* globals createImageBitmap */
// `ImageBitmap` is browser / DOM specific. It also can only work
//  same-domain (or CORS)

import Typeson from 'typeson';

const imagebitmap = {
    imagebitmap: {
        test (x) {
            return Typeson.toStringTag(x) === 'ImageBitmap' ||
                // In Node, our polyfill sets the dataset on a canvas
                //  element as JSDom no longer allows overriding toStringTag
                (x && x.dataset && x.dataset.toStringTag === 'ImageBitmap');
        },
        replace (bm) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bm, 0, 0);
            // Although `width` and `height` are part of `ImageBitMap`,
            //   these will be auto-created for us when reviving with the
            //   data URL (and they are not settable even if they weren't)
            // return {
            //   width: bm.width, height: bm.height, dataURL: canvas.toDataURL()
            // };
            return canvas.toDataURL();
        },
        revive (o) {
            /*
            var req = new XMLHttpRequest();
            req.open('GET', o, false); // Sync
            if (req.status !== 200 && req.status !== 0) {
              throw new Error('Bad ImageBitmap access: ' + req.status);
            }
            req.send();
            return req.responseText;
            */
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = document.createElement('img');
            // The onload is needed by some browsers per http://stackoverflow.com/a/4776378/271577
            img.addEventListener('load', function () {
                ctx.drawImage(img, 0, 0);
            });
            img.src = o;
            // Works in contexts allowing an `ImageBitmap` (We might use
            //   `OffscreenCanvas.transferToBitmap` when supported)
            return canvas;
        },
        reviveAsync (o) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = document.createElement('img');
            // The onload is needed by some browsers per http://stackoverflow.com/a/4776378/271577
            img.addEventListener('load', function () {
                ctx.drawImage(img, 0, 0);
            });
            img.src = o; // o.dataURL;
            return createImageBitmap(canvas); // Returns a promise
        }
    }
};

export default imagebitmap;
