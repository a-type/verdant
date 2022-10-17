import generateUUID from '../utils/generateUUID.js';

const cloneableObjectsByUUID = {};

const cloneable = {
    cloneable: {
        test (x) {
            return x && typeof x === 'object' &&
                typeof x[Symbol.for('cloneEncapsulate')] === 'function';
        },
        replace (clonable) {
            const encapsulated = clonable[Symbol.for('cloneEncapsulate')]();
            const uuid = generateUUID();
            cloneableObjectsByUUID[uuid] = clonable;
            return {uuid, encapsulated};
        },
        revive ({uuid, encapsulated}) {
            return cloneableObjectsByUUID[uuid][Symbol.for('cloneRevive')](
                encapsulated
            );
        }
    }
};

export default cloneable;
