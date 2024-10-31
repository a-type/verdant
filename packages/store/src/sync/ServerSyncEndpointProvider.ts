import { assert, ReplicaType } from '@verdant-web/common';
import { default as jwtDecode } from 'jwt-decode';
import { Context } from '../internal.js';

export interface ServerSyncEndpointProviderConfig {
	/**
	 * The location of the endpoint used to retrieve an
	 * authorization token for the client.
	 */
	authEndpoint?: string;
	/**
	 * A custom function to retrieve authorization
	 * data. Use whatever fetching mechanism you want.
	 */
	fetchAuth?: () => Promise<{
		accessToken: string;
	}>;
}

export interface SyncTokenInfo {
	url: string;
	fileUrl: string;
	type: ReplicaType;
	userId: string;
	libraryId: string;
	role?: string;
}

export class ServerSyncEndpointProvider {
	private cached = null as {
		http: string;
		websocket: string;
		files: string;
		token: string;
	} | null;
	tokenInfo: SyncTokenInfo | null = null;

	get type() {
		return this.tokenInfo?.type ?? ReplicaType.Realtime;
	}

	constructor(
		private config: ServerSyncEndpointProviderConfig,
		private ctx: Context,
	) {
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
			const fetchImpl = this.ctx.environment.fetch;
			result = await fetchImpl(this.config.authEndpoint!, {
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
		this.tokenInfo = {
			userId: decoded.sub,
			libraryId: decoded.lib,
			url: decoded.url,
			fileUrl: decoded.file,
			role: decoded.role,
			type: parseInt(decoded.type + '') as ReplicaType,
		};
		const url = new URL(decoded.url);
		url.protocol = url.protocol.replace('ws', 'http');
		const httpEndpoint = url.toString();
		url.protocol = url.protocol.replace('http', 'ws');
		const websocketEndpoint = url.toString();
		let fileEndpoint: string = decoded.file;
		if (!fileEndpoint) {
			// default to http endpoint + '/files';
			const fileUrl = new URL(httpEndpoint);
			fileUrl.pathname = fileUrl.pathname + '/files';
			fileEndpoint = fileUrl.toString();
		}
		this.cached = {
			http: httpEndpoint,
			websocket: websocketEndpoint,
			files: fileEndpoint,
			token: result.accessToken,
		};
		return this.cached;
	};

	clearCache = () => {
		this.cached = null;
	};
}
