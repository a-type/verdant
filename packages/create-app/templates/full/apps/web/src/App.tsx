import { UpdatePrompt } from '@/components/updatePrompt/UpdatePrompt.jsx';
import { useIsLoggedIn } from '@/hooks/useSession.js';
import { Pages } from '@/pages/Pages.jsx';
import { clientDescriptor, hooks } from '@/store.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, Suspense, useState } from 'react';
import { CompleteSubscription } from './components/subscription/CompleteSubscription.jsx';

export interface AppProps {}

export function App({}: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Suspense>
      <QueryClientProvider client={queryClient}>
        <LofiProvider>
          <Pages />
          <UpdatePrompt />
          <CompleteSubscription />
        </LofiProvider>
      </QueryClientProvider>
    </Suspense>
  );
}

function LofiProvider({ children }: { children: ReactNode }) {
  // only sync if logged in to the server
  const isLoggedIn = useIsLoggedIn();
  return (
    <hooks.Provider value={clientDescriptor} sync={isLoggedIn}>
      {children}
    </hooks.Provider>
  );
}
