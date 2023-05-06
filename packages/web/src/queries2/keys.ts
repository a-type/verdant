import { hashObject } from '@verdant/common';

export interface QueryParams {
	collection: string;
	range: IDBKeyRange | IDBValidKey | undefined;
	index?: string;
	direction?: IDBCursorDirection;
	limit?: number;
	single?: boolean;
	write?: boolean;
}

export function getQueryKey({ range, ...rest }: QueryParams) {
	let hashedRange;
	if (range instanceof IDBKeyRange) {
		hashedRange = hashObject({
			includes: range.includes,
			lower: range.lower,
			lowerOpen: range.lowerOpen,
			upper: range.upper,
			upperOpen: range.upperOpen,
		});
	} else {
		hashedRange = range;
	}
	return hashObject({ range: hashedRange, ...rest });
}
