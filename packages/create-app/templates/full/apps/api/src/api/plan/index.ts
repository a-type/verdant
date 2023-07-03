import { json, Router } from 'express';
import { createPlanHandler } from './create.js';
import {
  claimPlanInviteHandler,
  createPlanInviteHandler,
  planInviteDetailsHandler,
} from './invite.js';
import planStatusHandler from './status.js';

const planRouter: Router = Router();
planRouter.use(json());

planRouter.get('/', planStatusHandler);
planRouter.post('/', createPlanHandler);
planRouter.post('/invite', createPlanInviteHandler);
planRouter.post('/invite/claim/:inviteId', claimPlanInviteHandler);
planRouter.get('/invite/:inviteId', planInviteDetailsHandler);

export default planRouter;
