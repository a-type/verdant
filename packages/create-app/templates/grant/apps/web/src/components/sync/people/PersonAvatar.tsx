import { Profile } from '@/store.js';
import classNames from 'classnames';
import { Icon } from '@a-type/ui/components/icon';
import { CSSProperties } from 'react';
import { UserInfo } from '@{{todo}}/verdant';

export function PersonAvatar({
	person,
	className,
	popIn = true,
	...rest
}: {
	person: UserInfo<Profile, any> | null;
	className?: string;
	popIn?: boolean;
	style?: CSSProperties;
}) {
	return (
		<div
			data-pop={popIn}
			className={classNames(
				'layer-components:(flex items-center justify-center rounded-full border-default p-2px overflow-hidden w-24px h-24px select-none relative bg-white flex-shrink-0)',
				popIn &&
					'layer-variants:(animate-pop-in-from-half animate-ease-springy animate-duration-200)',
				!person && 'layer-components(border-dashed bg-gray2)',
				className,
			)}
			{...rest}
		>
			{person && <AvatarContent user={person} />}
			{!person && <Icon name="person" />}
		</div>
	);
}

function AvatarContent({ user }: { user: UserInfo<Profile, any> }) {
	if (user.profile?.imageUrl) {
		return (
			<img
				className="w-full h-full object-cover rounded-full"
				referrerPolicy="no-referrer"
				crossOrigin="anonymous"
				src={user.profile.imageUrl}
			/>
		);
	}
	return (
		<div className="color-black items-center justify-center flex text-sm font-bold rounded-full">
			{user.profile.name?.charAt(0) || '?'}
		</div>
	);
}
