import Typeson from 'typeson';

const set = {
    set: {
        test (x) { return Typeson.toStringTag(x) === 'Set'; },
        replace (st) {
            return [...st.values()];
        },
        revive (values) { return new Set(values); }
    }
};

export default set;
