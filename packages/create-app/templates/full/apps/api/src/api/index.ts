import { Router } from 'express';
import authRouter from './auth/index.js';
import planRouter from './plan/index.js';
import stripeRouter from './stripe/index.js';

const apiRouter: Router = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/plan', planRouter);
apiRouter.use('/stripe', stripeRouter);

export default apiRouter;
