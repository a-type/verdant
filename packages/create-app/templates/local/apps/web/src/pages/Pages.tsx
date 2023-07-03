import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './HomePage.jsx';
import { lazy } from 'react';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);

export function Pages() {
  return <RouterProvider router={router} />;
}
