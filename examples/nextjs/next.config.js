const NormalModuleReplacementPlugin =
	require('webpack').NormalModuleReplacementPlugin;

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
	},
	// webpack: (config, { isServer }) => {
	// 	config.plugins.push(
	// 		new NormalModuleReplacementPlugin(/.*/, function (resource) {
	// 			const lowerCaseRequest = resource.request.toLowerCase();

	// 			if (
	// 				!lowerCaseRequest.includes('node_modules') &&
	// 				lowerCaseRequest.endsWith('.js') &&
	// 				lowerCaseRequest[0] === '.' &&
	// 				resource.context.startsWith(path.resolve(__dirname)) &&
	// 				!resource.context.toLowerCase().includes('node_modules')
	// 			) {
	// 				resource.request = resource.request.substr(
	// 					0,
	// 					resource.request.length - 3,
	// 				);
	// 			}
	// 		}),
	// 	);
	// 	return config;
	// },
	transpilePackages: ['@lo-fi/web', '@lo-fi/common', '@lo-fi/react'],
};

module.exports = nextConfig;
