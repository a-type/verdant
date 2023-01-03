import { assert, ReplicaType } from '@lo-fi/common';
import { default as jwtDecode } from 'jwt-decode';

export interface ServerSyncEndpointProviderConfig {
	/**
	 * The location of the endpoint used to retrieve an
	 * authorization token for the client.
	 */
	authEndpoint?: string;
	/**
	 * A custom fetch function to retrieve authorization
	 * data.
	 */
	fetchAuth?: () => Promise<{
		accessToken: string;
	}>;
}

export class ServerSyncEndpointProvider {
	private cached = null as {
		http: string;
		websocket: string;
	} | null;
	type: ReplicaType = ReplicaType.Realtime;

	constructor(private config: ServerSyncEndpointProviderConfig) {
		if (!config.authEndpoint && !config.fetchAuth) {
			throw new Error(
				'Either authEndpoint or fetchAuth must be provided to ServerSyncEndpointProvider',
			);
		}
	}

	getEndpoints = async () => {
		if (this.cached) {
			return this.cached;
		}

		let result: { accessToken: string };
		if (this.config.fetchAuth) {
			result = await this.config.fetchAuth();
		} else {
			result = await fetch(this.config.authEndpoint!, {
				credentials: 'include',
			}).then((res) => {
				if (!res.ok) {
					throw new Error(
						`Auth endpoint returned non-200 response: ${res.status}`,
					);
				} else {
					return res.json();
				}
			});
		}
		assert(result.accessToken, 'No access token provided from auth endpoint');
		const decoded = (jwtDecode as any)(result.accessToken);
		assert(decoded.url, 'No sync endpoint provided from auth endpoint');
		assert(
			decoded.type !== undefined,
			'No replica type provided from auth endpoint',
		);
		this.type = parseInt(decoded.type + '');
		const url = new URL(decoded.url);
		url.searchParams.set('token', result.accessToken);
		url.protocol = url.protocol.replace('ws', 'http');
		const httpEndpoint = url.toString();
		url.protocol = url.protocol.replace('http', 'ws');
		const websocketEndpoint = url.toString();
		this.cached = { http: httpEndpoint, websocket: websocketEndpoint };
		return this.cached;
	};
}
