import { makeRoutes, Outlet, Router } from '@verdant-web/react-router';
import { HomePage } from './HomePage.jsx';
import { H1, P } from '@a-type/ui/components/typography';
import { ErrorBoundary } from '@a-type/ui/components/errorBoundary';
import { Spinner } from '@a-type/ui/components/spinner';
import {
	updateApp,
	updateState,
} from '@/components/updatePrompt/updateState.js';
import { lazy, useCallback, Suspense } from 'react';

const routes = makeRoutes([
	{
		path: '/',
		component: HomePage,
	},
	{
		path: '/settings',
		component: lazy(() => import('./SettingsPage.jsx')),
	},
	{
		path: '/privacy-policy',
		component: lazy(() => import('./PrivacyPolicyPage.jsx')),
	},
	{
		path: '/tos',
		component: lazy(() => import('./TermsAndConditionsPage.jsx')),
	},
]);

export function Pages() {
	const handleNavigate = useCallback(
		(_path: string, ev: { state?: any; skipTransition?: boolean }) => {
			if (updateState.updateAvailable) {
				console.info('Update ready to install, intercepting navigation...');
				updateApp();
				return false;
			}
		},
		[],
	);
	return (
		<ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
			<Suspense fallback={<Spinner />}>
				<Router routes={routes} onNavigate={handleNavigate}>
					<TopLoader />
					<Outlet />
				</Router>
			</Suspense>
		</ErrorBoundary>
	);
}

function ErrorFallback({ clearError }: { clearError: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center p-4">
			<div className="flex flex-col items-start justify-center gap-4 max-w-content">
				<H1>Something went wrong</H1>
				<P>
					Sorry about this. The app has crashed. You can try refreshing, but if
					that doesn't work, use the button below to report the issue.
				</P>
				<LinkButton to="/" onClick={clearError}>
					Go Home
				</LinkButton>
				<ReloadButton />
			</div>
		</div>
	);
}
