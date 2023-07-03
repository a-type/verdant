import { apiHost } from '@/config.js';
import { useQuery } from '@tanstack/react-query';

async function getSession(): Promise<{
  session: { userId: string; name: string; role: 'admin' | 'member' } | null;
  planStatus: string;
  isSubscribed: boolean;
  error?: Error;
}> {
  try {
    const meResult = await fetch(`${apiHost}/api/auth/session`, {
      credentials: 'include',
    });
    if (meResult.ok) {
      const json = await meResult.json();
      if (json.session) return json;
      return {
        session: null,
        isSubscribed: false,
        planStatus: 'No account found',
      };
    } else {
      if (meResult.status === 401) {
        return {
          session: null,
          isSubscribed: false,
          planStatus: 'No account found',
        };
      }
      return {
        session: null,
        isSubscribed: false,
        planStatus: 'No account found',
        error: new Error(`Failed to get session: ${meResult.status}`),
      };
    }
  } catch (e) {
    console.error(e);
    return {
      session: null,
      isSubscribed: false,
      planStatus: 'Unknown error',
      error: e as Error,
    };
  }
}

export function useSession() {
  return useQuery(['session'], getSession, {});
}

export function useIsLoggedIn() {
  const { data, isInitialLoading } = useSession();
  return !isInitialLoading && !!data?.session;
}
