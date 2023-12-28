import { ErrorBoundary } from '@a-type/ui/components/errorBoundary';
import { Presence, Profile, hooks } from '@/store.js';
import { PersonAvatar } from './PersonAvatar.js';
import { ReactNode, createContext, useContext } from 'react';
import { UserInfo } from '@{{todo}}/verdant';
import classNames from 'classnames';

const PeopleContext = createContext<{ size: number }>({
	size: 24,
});

export function People({
	hideIfAlone,
	avatarClassName,
}: {
	hideIfAlone?: boolean;
	avatarClassName?: string;
}) {
	const peerIds = hooks.usePeerIds();

	const syncing = hooks.useSyncStatus();

	if (!syncing || (hideIfAlone && peerIds.length === 0)) {
		return null;
	}

	return (
		<ErrorBoundary>
			<PeopleList count={peerIds.length + 1}>
				<SelfAvatar className={avatarClassName} />
				{peerIds.map((peerId, index) => (
					<PeerAvatar
						key={peerId}
						peerId={peerId}
						index={index + 1}
						className={avatarClassName}
					/>
				))}
			</PeopleList>
		</ErrorBoundary>
	);
}

export function PeopleList({
	children,
	count,
	size = 24,
}: {
	children: ReactNode;
	count: number;
	size?: number;
}) {
	const width = count > 0 ? size + (count - 1) * ((size * 2) / 3) : 0;

	return (
		<PeopleContext.Provider value={{ size }}>
			<div
				className="relative flex-basis-auto"
				style={{ width, minWidth: width, height: size }}
			>
				{children}
			</div>
		</PeopleContext.Provider>
	);
}

export function PeopleListItem({
	index,
	children,
	className,
}: {
	index: number;
	children: ReactNode;
	className?: string;
}) {
	const { size } = useContext(PeopleContext);
	return (
		<div
			className={classNames('absolute', className)}
			style={{
				left: index === 0 ? 0 : index * ((size * 2) / 3),
				zIndex: index,
				top: 0,
			}}
		>
			{children}
		</div>
	);
}

function SelfAvatar({ className }: { className?: string }) {
	const self = hooks.useSelf();

	return <PersonAvatar person={self} className={className} />;
}

function PeerAvatar({
	peerId,
	index,
	className,
}: {
	peerId: string;
	index: number;
	className?: string;
}) {
	const peer = hooks.usePeer(peerId);

	if (!peer) {
		return null;
	}

	return (
		<PeopleListItem index={index}>
			<PersonAvatar person={peer} className={className} />
		</PeopleListItem>
	);
}

export function PeopleListAvatar({
	person,
	index,
	className,
	...rest
}: {
	person: UserInfo<Profile, Presence> | null;
	index: number;
	popIn?: boolean;
	className?: string;
}) {
	const { size } = useContext(PeopleContext);
	return (
		<PeopleListItem index={index} className={className}>
			<PersonAvatar
				person={person}
				style={{ width: size, height: size }}
				{...rest}
			/>
		</PeopleListItem>
	);
}
