export type Logger = (
	level: 'info' | 'warn' | 'error' | 'debug',
	...args: any[]
) => void;
