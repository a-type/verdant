import { Operation, OperationPatch } from '@verdant-web/common';

export type LogFunction = (...args: any[]) => void;

/**
 * Operations moving through the client system are
 * tagged with whether or not they are stored in
 * the database (confirmed) or only in memory,
 * which might mean they are lost if the client
 * crashes.
 */
export interface TaggedOperation extends Operation {
	confirmed?: boolean;
}
