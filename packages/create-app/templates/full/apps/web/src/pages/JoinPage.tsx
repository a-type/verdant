import { OAuthSignInButton } from '@/components/auth/OAuthSigninButton.jsx';
import { useSearchParams } from 'react-router-dom';

export interface JoinPageProps {}

export function JoinPage({}: JoinPageProps) {
  const [params] = useSearchParams({ returnTo: '/', inviteId: '' });

  let returnTo = params.get('returnTo') || undefined;

  return (
    <div>
      <h1>Join</h1>
      <div>
        <OAuthSignInButton provider="google" returnTo={returnTo}>
          Sign up with Google
        </OAuthSignInButton>
      </div>
    </div>
  );
}

export default JoinPage;
