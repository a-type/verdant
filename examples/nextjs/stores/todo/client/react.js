import { createHooks as baseCreateHooks } from '@lo-fi/react';
import schema from './schema';

export function createHooks() {
	return baseCreateHooks(schema);
}
