import Typeson from 'typeson';

const regexp = {
    regexp: {
        test (x) { return Typeson.toStringTag(x) === 'RegExp'; },
        replace (rexp) {
            return {
                source: rexp.source,
                flags: (rexp.global ? 'g' : '') +
                    (rexp.ignoreCase ? 'i' : '') +
                    (rexp.multiline ? 'm' : '') +
                    (rexp.sticky ? 'y' : '') +
                    (rexp.unicode ? 'u' : '')
            };
        },
        revive ({source, flags}) { return new RegExp(source, flags); }
    }
};

export default regexp;
