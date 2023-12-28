import { useEffect } from 'react';
import { checkForUpdate } from '@/components/updatePrompt/updateState.js';
import { H1, H2 } from '@a-type/ui/components/typography';
import { UpdatePrompt } from '@/components/updatePrompt/UpdatePrompt.jsx';
import { TextLink } from '@/components/nav/Link.jsx';
import { ColorModeSelect } from '@/components/settings/ColorModeSelect.jsx';

export interface SettingsPageProps {}

export function SettingsPage({}: SettingsPageProps) {
	useEffect(() => {
		checkForUpdate();
	}, []);

	return (
		<PageContent fullHeight noPadding>
			<div className="flex flex-col w-full mt-6 p-4 gap-4 items-start">
				<H1>Settings</H1>
				<UpdatePrompt />
				<div className="flex flex-col items-start w-full gap-4">
					<ColorModeSelect />
				</div>
				<div className="text-xs flex flex-col gap-2">
					<TextLink to="/privacy-policy">Privacy policy</TextLink>
					<TextLink to="/tos">Terms and conditions of use</TextLink>
				</div>
			</div>
		</PageContent>
	);
}

export default SettingsPage;
