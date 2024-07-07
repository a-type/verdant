import { authz } from '@verdant-web/common';

export const authorization = {
	private: authz.onlyMe(),
	public: undefined,
};
