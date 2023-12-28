import { Onboarding, OnboardingStep } from '@/onboarding/createOnboarding.js';
import classNames from 'classnames';
import { ReactNode } from 'react';
import {
	CollapsibleContent,
	CollapsibleRoot,
} from '@a-type/ui/components/collapsible';
import { Button } from '@a-type/ui/components/button';

export interface OnboardingBannerProps<O extends Onboarding<any>> {
	onboarding: O;
	step: O extends Onboarding<infer S> ? S[number] : never;
	children: ReactNode;
	className?: string;
	disableNext?: boolean;
}

export function OnboardingBanner<O extends Onboarding<any>>({
	onboarding,
	step,
	children,
	className,
	disableNext,
}: OnboardingBannerProps<O>) {
	const [show, next, isLast, isOnly] = onboarding.useStep(step);

	return (
		<CollapsibleRoot
			open={show}
			className={classNames('theme-leek', 'w-full', className)}
		>
			<CollapsibleContent>
				<div className="flex flex-col w-full bg-primaryWash color-black p-4 rounded-lg gap-3">
					<div>{children}</div>
					<div className="flex justify-end gap-3">
						{!disableNext && (
							<Button color="ghost" onClick={next}>
								{isLast ? (isOnly ? 'Ok' : 'Finish') : 'Next'}
							</Button>
						)}
					</div>
				</div>
			</CollapsibleContent>
		</CollapsibleRoot>
	);
}
