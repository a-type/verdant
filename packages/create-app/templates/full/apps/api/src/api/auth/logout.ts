import { Request, Response } from 'express';
import { removeTokenCookie } from '../../cookies.js';
import { uiHost } from '../../config.js';

export default async function logoutHandler(req: Request, res: Response) {
	removeTokenCookie(res);
	res.writeHead(302, { Location: uiHost });
	res.end();
}
