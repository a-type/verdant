import Typeson from 'typeson';

const error = {
    error: {
        test (x) { return Typeson.toStringTag(x) === 'Error'; },
        replace ({name, message}) {
            return {name, message};
        },
        revive ({name, message}) {
            const e = new Error(message);
            e.name = name;
            return e;
        }
    }
};
// See also errors.js that may be registered after having registered this type.

export default error;
