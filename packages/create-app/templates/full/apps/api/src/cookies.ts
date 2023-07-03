import { parse, serialize } from 'cookie';
import { Request, Response } from 'express';
import { IncomingMessage, OutgoingMessage } from 'http';

const SESSION_COOKIE = '{{todo}}-session';
const RETURN_TO_COOKIE = '{{todo}}-return-to';
const INVITE_COOKIE = '{{todo}}-invite';

export const MAX_AGE = 60 * 60 * 24 * 14; // 2 weeks

export function setTokenCookie(res: OutgoingMessage, token: string) {
  const cookie = serialize(SESSION_COOKIE, token, {
    maxAge: MAX_AGE,
    expires: new Date(Date.now() + MAX_AGE * 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}

export function removeTokenCookie(res: OutgoingMessage) {
  const cookie = serialize(SESSION_COOKIE, '', {
    maxAge: -1,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}

export function parseCookies(req: IncomingMessage) {
  if ((req as any).cookies) return (req as any).cookies;

  const cookie = req.headers?.cookie;
  return parse(cookie || '');
}

export function getTokenCookie(req: IncomingMessage) {
  return parseCookies(req)[SESSION_COOKIE];
}

export function setReturnToCookie(req: Request, res: Response) {
  let returnTo = req.query.returnTo as string | undefined;
  if (!returnTo) {
    returnTo = req.headers.referer as string | undefined;
  }
  if (!returnTo) {
    return;
  }

  const cookie = serialize(RETURN_TO_COOKIE, returnTo, {
    maxAge: MAX_AGE,
    expires: new Date(Date.now() + MAX_AGE * 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}

export function getReturnToCookie(req: IncomingMessage) {
  return parseCookies(req)[RETURN_TO_COOKIE];
}

export function removeReturnToCookie(res: OutgoingMessage) {
  const cookie = serialize(RETURN_TO_COOKIE, '', {
    maxAge: -1,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}

export function setInviteIdCookie(req: Request, res: Response) {
  let inviteId = req.query.inviteId as string | undefined;
  if (!inviteId) {
    return;
  }

  const cookie = serialize(INVITE_COOKIE, inviteId, {
    maxAge: MAX_AGE,
    expires: new Date(Date.now() + MAX_AGE * 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}

export function getInviteIdCookie(req: IncomingMessage) {
  return parseCookies(req)[INVITE_COOKIE];
}

export function removeInviteIdCookie(res: OutgoingMessage) {
  const cookie = serialize(INVITE_COOKIE, '', {
    maxAge: -1,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
}
