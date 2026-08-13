import { Entity } from '../entities/Entity.js';
import type { QueryStatus } from './BaseQuery.js';

export type QueryTiming = {
	sweep: number | null;
	hydration: number | null;
	total: number | null;
};

export type QueryDiagnostic = {
	key: string;
	collection: string;
	type: string;
	status: QueryStatus;
	active: boolean;
	result: unknown;
	timing: QueryTiming;
};

export type QueryDiagnostics = {
	queries: QueryDiagnostic[];
};

export const getDiagnosticResult = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(getDiagnosticResult);
	}
	if (value instanceof Entity) {
		return value.getSnapshot();
	}
	return value;
};
