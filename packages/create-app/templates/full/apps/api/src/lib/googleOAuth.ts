import { google, Auth } from 'googleapis';
import {
  googleAuthClientId,
  googleAuthClientSecret,
  serverHost,
} from '../config.js';

export const googleOauth: Auth.OAuth2Client = new google.auth.OAuth2(
  googleAuthClientId,
  googleAuthClientSecret,
  `${serverHost}/api/auth/google/callback`,
);
