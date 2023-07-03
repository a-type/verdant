import { Request, Response } from 'express';
import { URL } from 'url';
import { getReturnToCookie, removeReturnToCookie } from '../../cookies.js';
import { uiHost } from '../../config.js';

export default async function loginSuccessHandler(req: Request, res: Response) {
	// read returnTo cookie to see if we have a redirect,
	// otherwise redirect to /

	const returnTo = getReturnToCookie(req) || '/';

	// remove the cookie
	removeReturnToCookie(res);

	const returnToUrl = new URL(returnTo, uiHost);

	// redirect to returnTo
	res.writeHead(302, { Location: returnToUrl.toString() });
	res.end();
}
