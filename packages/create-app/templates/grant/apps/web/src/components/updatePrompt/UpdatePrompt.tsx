import { useState } from 'react';
import { Button } from '@a-type/ui/components/button';
import {
	updateApp,
	updateState,
} from '@/components/updatePrompt/updateState.js';
import { useSnapshot } from 'valtio';

export interface UpdatePromptProps {}

const TEST = false;

export function UpdatePrompt({}: UpdatePromptProps) {
	const updateAvailable = useSnapshot(updateState).updateAvailable;

	const [loading, setLoading] = useState(false);

	if (!updateAvailable && !TEST) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3 items-start bg-primary-wash color-black p-4 rounded-lg border border-solid border-primary w-full">
			<div>App update available!</div>
			<Button
				loading={loading}
				color="primary"
				onClick={async () => {
					try {
						setLoading(true);
						await updateApp(true);
					} finally {
						setLoading(false);
					}
				}}
			>
				Get the latest
			</Button>
		</div>
	);
}
