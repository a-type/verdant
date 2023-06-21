let scrollPositions =
	typeof window !== 'undefined'
		? JSON.parse(sessionStorage.getItem('scrollPositions') || '{}')
		: {};

export function recordScrollPosition(
	id: string,
	position: [number, number] | null,
) {
	if (position) {
		scrollPositions[id] = position;
	} else {
		delete scrollPositions[id];
	}
	sessionStorage.setItem('scrollPositions', JSON.stringify(scrollPositions));
}

export function getScrollPosition(id: string): [number, number] | false {
	return scrollPositions[id] || false;
}

export function consumeScrollPosition(id: string): [number, number] | false {
	const position = getScrollPosition(id);
	delete scrollPositions[id];
	sessionStorage.setItem('scrollPositions', JSON.stringify(scrollPositions));
	return position;
}
