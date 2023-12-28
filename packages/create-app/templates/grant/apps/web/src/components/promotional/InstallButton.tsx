import { installState, triggerInstall } from '@/install.js';
import { Button, ButtonProps } from '@a-type/ui/components/button';
import { Icon } from '@a-type/ui/components/icon';
import { useSnapshot } from 'valtio';

export function InstallButton(props: ButtonProps) {
	const { installReady } = useSnapshot(installState);

	if (!installReady) return null;

	return (
		<Button
			color="ghost"
			size="small"
			className="font-normal"
			onClick={triggerInstall}
			{...props}
		>
			{props.children || (
				<>
					<Icon name="download" />
					<span>Install app</span>
				</>
			)}
		</Button>
	);
}
