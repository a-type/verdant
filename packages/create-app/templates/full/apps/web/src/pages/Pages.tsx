import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './HomePage.jsx';
import { lazy } from 'react';

// dynamically import pages that may not be visited
const JoinPage = lazy(() => import('./JoinPage.jsx'));
const ClaimInvitePage = lazy(() => import('./ClaimInvitePage.jsx'));
const SettingsPage = lazy(() => import('./SettingsPage.jsx'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/join',
    element: <JoinPage />,
  },
  {
    path: '/claim/:inviteId',
    element: <ClaimInvitePage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
]);

export function Pages() {
  return <RouterProvider router={router} />;
}
