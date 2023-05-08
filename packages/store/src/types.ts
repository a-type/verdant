import { Operation, OperationPatch } from '@verdant-web/common';

export interface LocalOperation extends Operation {
	inverse: OperationPatch;
}

export type LogFunction = (...args: any[]) => void;
