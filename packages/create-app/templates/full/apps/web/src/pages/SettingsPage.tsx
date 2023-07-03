import { ManageSubscriptionButton } from '@/components/subscription/ManageSubscriptionButton.jsx';
import { useCreateInviteLink } from '@/hooks/useCreateInviteLink.js';
import { useSession } from '@/hooks/useSession.js';
import { useCallback, useState } from 'react';

export interface SettingsPageProps {}

export function SettingsPage({}: SettingsPageProps) {
  const { data } = useSession();

  return (
    <div>
      <h1>Settings</h1>
      {!!data && <InviteLink />}
      {data?.isSubscribed && <ManageSubscriptionButton />}
    </div>
  );
}

function InviteLink() {
  const [link, setLink] = useState('');
  const createLink = useCreateInviteLink();

  const generate = useCallback(async () => {
    setLink(await createLink());
  }, [createLink, setLink]);

  return (
    <div>
      <button onClick={generate}>Generate Invite Link</button>
      <input value={link} />
    </div>
  );
}

export default SettingsPage;
