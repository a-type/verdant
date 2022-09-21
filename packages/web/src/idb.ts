export function storeRequestPromise<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => {
			resolve(request.result);
		};
		request.onerror = () => {
			reject(request.error);
		};
	});
}

export function cursorIterator<T>(
	request: IDBRequest<IDBCursorWithValue | null>,
	callback: (value: T | null) => boolean,
) {
	return new Promise<void>((resolve, reject) => {
		request.onsuccess = () => {
			const cursor = request.result;
			if (cursor) {
				if (callback(cursor.value)) {
					cursor.continue();
				} else {
					resolve();
				}
			} else {
				resolve();
			}
		};
		request.onerror = () => {
			reject(request.error);
		};
	});
}
