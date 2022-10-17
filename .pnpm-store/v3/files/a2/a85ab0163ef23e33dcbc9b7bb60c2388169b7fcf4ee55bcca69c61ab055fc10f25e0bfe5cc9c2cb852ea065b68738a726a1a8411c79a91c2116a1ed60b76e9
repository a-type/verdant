import Typeson from 'typeson';

const date = {
    date: {
        test (x) { return Typeson.toStringTag(x) === 'Date'; },
        replace (dt) {
            const time = dt.getTime();
            if (Number.isNaN(time)) {
                return 'NaN';
            }
            return time;
        },
        revive (time) {
            if (time === 'NaN') {
                return new Date(Number.NaN);
            }
            return new Date(time);
        }
    }
};

export default date;
