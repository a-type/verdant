import { apiHost, host } from '@/config.js';
import { useCallback } from 'react';

export function useCreateInviteLink() {
  return useCallback(async function generateLink() {
    const res = await fetch(`${apiHost}/api/plan/invite`, {
      method: 'post',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    });
    if (res.ok) {
      const resp = await res.json();
      const link = `${host}/claim/${resp.inviteId}`;
      return link;
    } else {
      throw new Error('Failed to generate invite link');
    }
  }, []);
}
