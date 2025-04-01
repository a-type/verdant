export type VerdantLogger = (
	level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
	...args: any[]
) => void;

export const noLogger = () => {};

export const makeLogger =
	(prefix?: string): VerdantLogger =>
	(level, ...args) => {
		if (level === 'critical') {
			args.unshift('[CRITICAL]');
		}
		if (prefix) {
			args.unshift(`[${prefix}]`);
		}
		if (level === 'critical') {
			console.error(...args);
		} else {
			console[level](...args);
		}
	};

export function debugLogger(prefix?: string): VerdantLogger {
	if (!localStorage.getItem('DEBUG')) {
		return noLogger;
	}
	return makeLogger(prefix);
}
