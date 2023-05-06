import { Operation, OperationPatch } from '@verdant/common';

export interface LocalOperation extends Operation {
	inverse: OperationPatch;
}

export type LogFunction = (...args: any[]) => void;
