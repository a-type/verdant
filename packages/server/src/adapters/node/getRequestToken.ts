import { VerdantError } from '@verdant-web/common';

export function getRequestToken(req: Request) {
	if (req.method === 'OPTIONS') {
		// preflight request, np
		return null;
	}
	// websocket compat - we only receive one header...
	const protocolHeader = req.headers.get('Sec-WebSocket-Protocol');
	if (protocolHeader) {
		const [type, token] = protocolHeader.split(',');
		if (type === 'Bearer') {
			return token.trim();
		}
	}

	const authHeader = req.headers.get('Authorization');
	if (!authHeader) {
		throw new VerdantError(
			VerdantError.Code.NoToken,
			undefined,
			'Authorization header is required',
		);
	}
	const [type, token] = authHeader.split(' ');
	if (type !== 'Bearer') {
		throw new VerdantError(
			VerdantError.Code.InvalidToken,
			undefined,
			'Authorization type must be Bearer',
		);
	}
	return token;
}
