import { json, Router } from 'express';
import googleCallbackHandler from './google/callback.js';
import loginSuccessHandler from './loginSuccess.js';
import googleLoginHandler from './google/login.js';
import logoutHandler from './logout.js';
import sessionHandler from './session.js';
import verdantAuthHandler from './verdant.js';

const authRouter: Router = Router();
authRouter.use(json());

authRouter.post('/logout', logoutHandler);
authRouter.get('/session', sessionHandler);
authRouter.use('/loginSuccess', loginSuccessHandler);
authRouter.post('/google/login', googleLoginHandler);
authRouter.use('/google/callback', googleCallbackHandler);
authRouter.use('/verdant', verdantAuthHandler);

export default authRouter;
