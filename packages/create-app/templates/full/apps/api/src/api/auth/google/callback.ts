import { prisma, User } from '@{{todo}}/prisma';
import { Request, Response } from 'express';
import { getInviteIdCookie } from '../../../cookies.js';
import { join } from '../../../auth/join.js';
import { setLoginSession } from '../../../session.js';
import { googleOauth } from '../../../lib/googleOAuth.js';

export default async function googleCallbackHandler(
  req: Request,
  res: Response,
) {
  const { code } = req.query;
  if (typeof code !== 'string') throw new Error('code is required');
  const { tokens } = await googleOauth.getToken(code);
  googleOauth.setCredentials(tokens);
  const profileResponse = await googleOauth.request({
    url: 'https://www.googleapis.com/oauth2/v3/userinfo',
  });
  if (profileResponse.status !== 200) {
    throw new Error(
      `Failed to fetch profile: ${profileResponse.status} ${profileResponse.data}`,
    );
  }
  const profile = profileResponse.data as GoogleOAuthProfile;

  const inviteId = getInviteIdCookie(req);

  // find an existing Google account association and user
  const accountAndUser = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: profile.sub,
      },
    },
    include: {
      user: true,
    },
  });

  let user: User;

  if (!accountAndUser) {
    user = await join({
      inviteId,
      email: profile.email,
      fullName: profile.name,
      friendlyName: profile.given_name,
      picture: profile.picture,
      providerAccount: {
        accessToken: tokens.access_token!,
        tokenType: 'Bearer',
        provider: 'google',
        providerAccountId: profile.sub,
        type: 'oauth2',
      },
    });
  } else {
    user = accountAndUser.user;
  }

  await setLoginSession(res, {
    userId: user.id,
    name: user.name,
    planId: user.planId,
    role: user.role as 'admin' | 'user',
  });

  // TODO: safari hack compat
  res.writeHead(302, { Location: '/api/auth/loginSuccess' });
  res.end();
}

type GoogleOAuthProfile = {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified: boolean;
  locale: string;
};
