import { useScrollRestoration } from '@verdant-web/react-router';
import { useRef } from 'react';

function findScrollableParent(
	element: HTMLElement | null,
): HTMLElement | Window | null {
	if (!element) {
		return null;
	}

	const style = getComputedStyle(element);
	const overflowY = style.overflowY || style.overflow;

	if (overflowY !== 'visible' && overflowY !== 'hidden') {
		return element;
	}

	if (!element.parentElement) {
		return window;
	}

	return findScrollableParent(element.parentElement);
}

// TODO: make this official in verdant-web/react-router ?
export function AutoRestoreScroll({
	id,
	debug,
}: {
	id?: string;
	debug?: boolean;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useScrollRestoration({
		onGetScrollPosition() {
			const scrollable = findScrollableParent(ref.current);
			if (!scrollable) return false;

			if (scrollable instanceof HTMLElement) {
				return [scrollable.scrollLeft, scrollable.scrollTop];
			}
			return [scrollable.scrollX, scrollable.scrollY];
		},
		onScrollRestored(position) {
			const scrollable = findScrollableParent(ref.current);
			if (!scrollable) return;

			if (scrollable instanceof HTMLElement) {
				scrollable.scrollTo(position[0], position[1]);
			} else {
				scrollable.scrollTo({
					left: position[0],
					top: position[1],
				});
			}
		},
		id,
		debug,
	});

	return (
		<div className="absolute z--1 w-0 h-0 pointer-events-none" ref={ref} />
	);
}
