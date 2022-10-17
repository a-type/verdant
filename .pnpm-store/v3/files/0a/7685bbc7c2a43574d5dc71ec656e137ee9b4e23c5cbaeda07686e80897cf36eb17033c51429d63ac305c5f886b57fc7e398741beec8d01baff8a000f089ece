/* globals ImageData */
// `ImageData` is browser / DOM specific (though `node-canvas` has it
//   available on `Canvas`).

import Typeson from 'typeson';

const imagedata = {
    imagedata: {
        test (x) { return Typeson.toStringTag(x) === 'ImageData'; },
        replace (d) {
            return {
                // Ensure `length` gets preserved for revival
                array: [...d.data],
                width: d.width,
                height: d.height
            };
        },
        revive (o) {
            return new ImageData(
                new Uint8ClampedArray(o.array), o.width, o.height
            );
        }
    }
};

export default imagedata;
