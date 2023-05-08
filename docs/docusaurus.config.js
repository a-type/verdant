// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'Verdant',
	tagline: 'Local-first framework',
	url: 'https://verdant.dev',
	baseUrl: '/',
	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',
	favicon: 'favicon.ico',

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: 'a-type', // Usually your GitHub org/user name.
	projectName: 'verdant', // Usually your repo name.
	deploymentBranch: 'gh-pages',
	trailingSlash: false,

	// Even if you don't use internalization, you can use this field to set useful
	// metadata like html lang. For example, if your site is Chinese, you may want
	// to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					sidebarPath: require.resolve('./sidebars.js'),
				},
				// blog: {
				// 	showReadingTime: true,
				// 	// Please change this to your repo.
				// 	// Remove this to remove the "edit this page" links.
				// 	editUrl:
				// 		'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
				// },
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			metadata: [
				{
					name: 'twitter:card',
					content: 'summary_large_image',
				},
				{
					name: 'twitter:title',
					content: 'verdant',
				},
				{
					name: 'twitter:description',
					content: 'a framework for small, sustainable, human apps',
				},
				{
					name: 'twitter:image',
					content: 'https://verdant.dev/opengraph.png',
				},
				{
					name: 'og:image',
					content: 'https://verdant.dev/opengraph.png',
				},
			],
			colorMode: {
				defaultMode: 'dark',
			},
			navbar: {
				title: 'Verdant',
				logo: {
					alt: 'Verdant logo',
					src: 'favicon-32x32.png',
				},
				items: [
					{
						type: 'doc',
						docId: 'intro',
						position: 'left',
						label: 'Docs',
					},
					{
						href: 'https://github.com/a-type/verdant',
						label: 'GitHub',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'dark',
				links: [
					{
						title: 'Docs',
						items: [
							{
								label: 'Docs',
								to: '/docs/intro',
							},
						],
					},
					{
						title: 'Community',
						items: [
							{
								label: 'GitHub',
								href: 'https://github.com/a-type/verdant/discussions',
							},
							{
								label: 'Discord',
								href: 'https://discord.gg/V9NzJrYVKU',
							},
						],
					},
					{
						title: 'More',
						items: [
							{
								label: 'GitHub',
								href: 'https://github.com/a-type/verdant',
							},
							{
								label: 'Grant',
								to: 'https://gfor.rest',
							},
						],
					},
				],
				copyright: `Copyright © ${new Date().getFullYear()} Grant Forrest. Built with Docusaurus.`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
		}),
};

module.exports = config;
