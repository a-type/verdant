import { posixify } from './posixify.js';
import path from 'path';

export function posixRelative(a: string, b: string) {
	return posixify(path.relative(path.resolve(a), path.resolve(b)));
}
