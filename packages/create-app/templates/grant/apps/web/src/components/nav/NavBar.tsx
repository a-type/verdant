import { Link } from '@/components/nav/Link.jsx';
import { PageNav } from '@a-type/ui/components/layouts';
import { Icon } from '@a-type/ui/components/icon';
import { useOnLocationChange } from '@verdant-web/react-router';
import classNames from 'classnames';
import {
	ReactNode,
	Suspense,
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { useSnapshot } from 'valtio';
import { PopEffect } from './PopEffect.jsx';
import { withClassName } from '@a-type/ui/hooks';
import { hooks } from '@/store.js';

export interface NavBarProps {}

export function NavBar({}: NavBarProps) {
	const [pathname, setPathname] = useState(() => window.location.pathname);
	useOnLocationChange((location) => setPathname(location.pathname));
	const matchDefaultList = pathname === '/';
	const matchList = pathname.startsWith('/list');
	const matchGroceries = matchDefaultList || matchList;
	const matchPurchased = pathname.startsWith('/pantry');
	const matchRecipes = pathname.startsWith('/recipes');
	const matchSettings = pathname.startsWith('/settings');

	return (
		<PageNav
			className={classNames(
				'flex flex-row items-stretch justify-around w-full rounded-0 rounded-t-lg shadow-lg overflow-hidden z-50 bg-wash border-t border-t-solid border-gray5 p-1 h-auto',
				'pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]',
				'sm:(bg-transparent flex flex-col rounded-0 border-none border-transparent shadow-none h-min-content overflow-y-auto overflow-x-hidden justify-start items-stretch gap-2 pb-10)',
			)}
		>
			<Suspense>
				<div className="hidden sm:(flex flex-row gap-1 items-center justify-center px-2 py-4)">
					<img src="/android-chrome-192x192.png" className="w-40px h-40px" />
					<h1 className="text-md font-title font-medium">{{ todo }}</h1>
				</div>
				<GroceriesNavBarLink active={matchGroceries} />
				<PantryNavBarLink active={matchPurchased} />
				<RecipesNavBarLink active={matchRecipes} />
				<SettingsNavBarLink active={matchSettings} />
			</Suspense>
		</PageNav>
	);
}

const NavBarLink = memo(
	forwardRef<
		HTMLAnchorElement,
		{
			to: string;
			children: ReactNode;
			icon: ReactNode;
			animate?: boolean;
			active: boolean;
			onClick?: () => void;
			onHover?: () => void;
		}
	>(function NavBarLink(
		{ to, children, icon, animate, active, onClick, onHover },
		ref,
	) {
		// reset undo history when navigating
		const client = hooks.useClient();
		const handleClick = useCallback(() => {
			client.undoHistory.clear();
			onClick?.();
		}, [client]);

		return (
			<Link
				to={to}
				className={classNames(navBarLinkRootClass, {
					'important:(color-black bg-primaryWash)': active,
					active: active,
				})}
				data-active={active}
				onClick={handleClick}
				onMouseOver={onHover}
				ref={ref}
			>
				<NavBarLinkIcon>
					<PopEffect active={animate} />
					{icon}
				</NavBarLinkIcon>
				<NavBarLinkText data-active={!!active}>{children}</NavBarLinkText>
			</Link>
		);
	}),
);

const navBarLinkRootClass = classNames(
	'layer-components:(flex flex-col items-center justify-center whitespace-nowrap py-1 px-3 bg-transparent rounded-md border-none cursor-pointer text-sm transition-colors h-full gap-6px relative text-inherit)',
	'layer-components:sm:(flex-row-reverse h-auto justify-start gap-2 overflow-visible)',
	'layer-components:hover:bg-primaryWash',
	'layer-components:focus-visible:(outline-none bg-primaryWash)',
	'layer-components:active:bg-primaryWash',
);

const NavBarLinkIcon = withClassName(
	'div',
	'relative flex sm:(p-6px rounded-full bg-lightBlend)',
);

const NavBarLinkText = withClassName(
	'span',
	'overflow-hidden pl-1 inline-block text-xxs whitespace-nowrap text-ellipsis sm:(text-md leading-normal)',
);

const NavIcon = withClassName(
	Icon,
	'relative z-1 [a[data-active=true]_&]:fill-primary-light',
);

function RecipesNavBarLink({ active }: { active: boolean }) {
	const client = hooks.useClient();
	const preload = useCallback(() => {
		// fire off the query to preload it
		client.recipes.findAll();
	}, []);

	return (
		<NavBarLink
			to="/recipes"
			icon={<NavIcon name="book" />}
			active={active}
			onHover={preload}
		>
			Recipes
		</NavBarLink>
	);
}

function PantryNavBarLink({ active }: { active: boolean }) {
	return (
		<NavBarLink to="/pantry" icon={<NavIcon name="food" />} active={active}>
			<span>Pantry</span>
		</NavBarLink>
	);
}

function GroceriesNavBarLink({ active }: { active: boolean }) {
	return (
		<NavBarLink to="/" icon={<NavIcon name="cart" />} active={active}>
			Groceries
		</NavBarLink>
	);
}

function SettingsNavBarLink({ active }: { active: boolean }) {
	return (
		<NavBarLink
			to="/settings"
			icon={<NavIcon name="profile" />}
			active={active}
		>
			<span>Settings</span>
		</NavBarLink>
	);
}
