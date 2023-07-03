import { UpdatePrompt } from '@/components/updatePrompt/UpdatePrompt.jsx';
import { clientDescriptor, hooks } from '@/store.js';
import { ReactNode, Suspense } from 'react';
import { Pages } from '@/pages/Pages.jsx';

export interface AppProps {}

export function App({}: AppProps) {
  return (
    <Suspense>
      <LofiProvider>
        <Pages />
        <UpdatePrompt />
      </LofiProvider>
    </Suspense>
  );
}

function LofiProvider({ children }: { children: ReactNode }) {
  return <hooks.Provider value={clientDescriptor}>{children}</hooks.Provider>;
}
