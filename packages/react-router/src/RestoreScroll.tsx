import { memo } from 'react';
import { useScrollRestoration } from './hooks.js';

export interface RestoreScrollProps {
	/**
	 * If you are restoring multiple scroll containers which may be
	 * rendered at the same time, you should provide a unique ID
	 * for each one so they get assigned the correct scroll position.
	 */
	id?: string;
	/**
	 * Override which scrollable element to record and restore from.
	 * Defaults to the window.
	 */
	scrollableRef?: React.RefObject<HTMLElement>;
	/**
	 * Logs output when recording or restoring scroll.
	 */
	debug?: boolean;
}

/**
 * This component restores scroll positions for navigation history
 * when it is mounted, and records scroll position when it is unmounted.
 * The goal of this being a component is you render it alongside
 * loaded content on the page, so that the scrollable container
 * is properly sized and positioned before restoring scroll.
 *
 * For example, if you load a list of items to populate a page, you can
 * render this component after the list is loaded, and it will restore
 * the scroll position to the correct item instead of getting stuck at 0
 * because the list starts empty and the page can't scroll.
 *
 * You can also use this component to restore scroll for a specific
 * scrollable container, like a modal dialog, instead of the window,
 * by passing a scrollableRef.
 *
 * If you have multiple RestoreScroll components in different containers,
 * it's highly recommended to pass an ID to each which is unique to
 * its container, so that scroll positions are stored and restored
 * separately.
 */
export const RestoreScroll = memo(function RestoreScroll({
	scrollableRef,
	debug,
	id,
}: RestoreScrollProps) {
	useScrollRestoration({
		onGetScrollPosition() {
			if (scrollableRef && !scrollableRef.current) {
				return false;
			}
			let x, y;
			if (scrollableRef) {
				x = scrollableRef.current!.scrollLeft;
				y = scrollableRef.current!.scrollTop;
			} else {
				x = window.scrollX;
				y = window.scrollY;
			}
			return [x, y];
		},
		onScrollRestored(scroll) {
			const target = scrollableRef ? scrollableRef.current : window;
			if (!target) {
				console.warn('Unable to restore scroll position: no target element');
			} else {
				target.scrollTo(scroll[0], scroll[1]);
			}
		},
		debug,
		id,
	});

	return null;
});
