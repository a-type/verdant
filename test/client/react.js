import { createHooks as baseCreateHooks } from '@verdant/react';
import schema from './schema.js';

export function createHooks() {
	return baseCreateHooks(schema);
}
