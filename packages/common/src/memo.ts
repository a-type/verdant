/**
 * Memoizes the last invocation of a function with the same memo keys.
 * As long as key identity and set doesn't change, the last computed
 * value will be returned.
 */
export function memoByKeys<TRet, TKeys extends any[]>(
	fn: (...args: unknown[]) => TRet,
	getKeys: () => TKeys,
): (...args: unknown[]) => TRet {
	let cachedKeys: TKeys | undefined;
	let cachedResult: TRet | undefined;
	return (...args: unknown[]) => {
		const keys = getKeys();
		if (
			cachedKeys &&
			cachedKeys.length === keys.length &&
			cachedKeys.every((key, i) => key === keys[i])
		) {
			return cachedResult!;
		}
		cachedKeys = [...keys] as TKeys;
		cachedResult = fn(...args);
		return cachedResult;
	};
}
