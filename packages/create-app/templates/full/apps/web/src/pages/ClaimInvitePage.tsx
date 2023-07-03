import { LoginButton } from '@/components/auth/LoginButton.js';
import { apiHost } from '@/config.js';
import { useSession } from '@/hooks/useSession.js';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export function ClaimInvitePage() {
  const { data: session, refetch } = useSession();

  const navigate = useNavigate();

  const { inviteId } = useParams() as { inviteId: string };

  const { data: inviteInfo } = useInviteInfo(inviteId);

  const inviterName = inviteInfo?.inviterName || '...';

  const claim = async () => {
    const res = await fetch(`${apiHost}/api/plan/invite/claim/${inviteId}`, {
      method: 'post',
      credentials: 'include',
    });

    if (res.ok) {
      refetch();
      navigate('/');
    } else {
      alert('Error claiming invite');
    }
  };

  if (session) {
    return (
      <div>
        <h1>Join {inviterName}'s plan</h1>
        <p>
          Your current data will be deleted, and you'll begin syncing your data
          with {inviterName}.
        </p>
        <button onClick={claim}>Claim Invite</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Sign up to join {inviterName}'s plan</h1>
      <LoginButton returnTo={`/claim/${inviteId}`} inviteId={inviteId}>
        Sign up
      </LoginButton>
    </div>
  );
}

export default ClaimInvitePage;

async function fetchInviteInfo(ctx: {
  queryKey: [string];
}): Promise<{ inviterName: string }> {
  const res = await fetch(`${apiHost}/api/plan/invite/${ctx.queryKey[0]}`, {
    credentials: 'include',
  });

  if (res.ok) {
    return res.json();
  } else {
    throw new Error('Error fetching invite info');
  }
}

function useInviteInfo(inviteId: string) {
  return useQuery([inviteId], fetchInviteInfo, {});
}
