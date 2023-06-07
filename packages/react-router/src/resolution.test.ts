import { describe, it, expect } from 'vitest';
import {
	getAllMatchingRoutes,
	getBestRouteMatch,
	getRoutePath,
	matchPath,
} from './resolution.js';

const Null = () => null;

describe('getRoutePath', () => {
	it('should return empty path and exact for index routes', () => {
		expect(
			getRoutePath({
				index: true,
				component: Null,
			}),
		).toEqual({
			path: '',
			exact: true,
		});
	});
	it('should return empty and not exact for wildcard routes', () => {
		expect(
			getRoutePath({
				path: '*',
				component: Null,
			}),
		).toEqual({
			path: '',
			exact: false,
		});
	});
	it('should return path and exact for normal exact routes', () => {
		expect(
			getRoutePath({
				path: '/foo',
				component: Null,
				exact: true,
			}),
		).toEqual({
			path: '/foo',
			exact: true,
		});
	});
	it('should return path and not exact for normal non-exact routes', () => {
		expect(
			getRoutePath({
				path: '/foo',
				exact: false,
				component: Null,
			}),
		).toEqual({
			path: '/foo',
			exact: false,
		});
	});
});

describe('matchPath', () => {
	it('should match simple, exact non-param routes', () => {
		const route = {
			path: '/foo',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo', '', route)).toEqual({
			path: '/foo',
			params: {},
			route,
		});
	});

	it('should match simple, non-exact non-param routes', () => {
		const route = {
			path: '/foo',
			component: Null,
		};
		expect(matchPath('/foo/bar', '', route)).toEqual({
			path: '/foo',
			params: {},
			route,
		});
	});

	it('should match exact routes with parameters', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/baz', '', route)).toEqual({
			path: '/foo/baz',
			params: { bar: 'baz' },
			route,
		});
	});

	it('should match non-exact routes with parameters', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
		};
		expect(matchPath('/foo/baz/qux', '', route)).toEqual({
			path: '/foo/baz',
			params: { bar: 'baz' },
			route,
		});
	});

	it('should not match exact routes if path is longer', () => {
		const route = {
			path: '/foo',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/bar', '', route)).toEqual(null);
	});

	it('should not match exact routes with parameters if path is longer', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/baz/bop', '', route)).toEqual(null);
	});

	it('should incorporate basepath into exact simple match', () => {
		const route = {
			path: '/foo',
			component: Null,
			exact: true,
		};
		expect(matchPath('/bar/foo', '/bar', route)).toEqual({
			path: '/bar/foo',
			params: {},
			route,
		});
	});

	it('should incorporate basepath into non-exact simple match', () => {
		const route = {
			path: '/foo',
			component: Null,
		};
		expect(matchPath('/bar/foo/baz', '/bar', route)).toEqual({
			path: '/bar/foo',
			params: {},
			route,
		});
	});

	it('should incorporate basepath into param match', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
		};
		expect(matchPath('/bar/foo/baz', '/bar', route)).toEqual({
			path: '/bar/foo/baz',
			params: { bar: 'baz' },
			route,
		});
	});
});

describe('getBestRouteMatch', () => {
	it('should return null if no routes match', () => {
		expect(getBestRouteMatch('/foo', '', [])).toEqual(null);
	});

	it('should match the first of multiple matches', () => {
		const routes = [
			{
				path: '/foo',
				component: Null,
			},
			{
				path: '*',
				component: Null,
			},
		];
		expect(getBestRouteMatch('/foo/bar', '', routes)).toEqual({
			path: '/foo',
			params: {},
			route: routes[0],
		});
	});

	it('should incorporate basepath', () => {
		const routes = [
			{
				path: '/foo',
				component: Null,
			},
			{
				path: '*',
				component: Null,
			},
		];
		expect(getBestRouteMatch('/bar/foo', '/bar', routes)).toEqual({
			path: '/bar/foo',
			params: {},
			route: routes[0],
		});
	});

	it('should work with wildcards', () => {
		const routes = [
			{
				path: '*',
				component: Null,
			},
		];
		expect(getBestRouteMatch('/foo', '', routes)).toEqual({
			path: '/foo',
			params: {},
			route: routes[0],
		});
	});
});

describe('getAllMatchingRoutes', () => {
	it('should return empty array if no routes match', () => {
		expect(getAllMatchingRoutes('/foo', '', [])).toEqual([]);
	});

	it('should follow a simple nested route path', () => {
		const routes = [
			{
				path: '/foo',
				component: Null,
				children: [
					{
						path: '/bar',
						component: Null,
					},
				],
			},
		];
		expect(getAllMatchingRoutes('/foo/bar', '', routes)).toEqual([
			{
				path: '/foo',
				params: {},
				route: routes[0],
			},
			{
				path: '/foo/bar',
				params: {},
				route: routes[0].children[0],
			},
		]);
	});

	it('should follow a simple nested route path with a wildcard', () => {
		const routes = [
			{
				path: '/foo',
				component: Null,
				children: [
					{
						path: '*',
						component: Null,
					},
				],
			},
		];
		expect(getAllMatchingRoutes('/foo/bar', '', routes)).toEqual([
			{
				path: '/foo',
				params: {},
				route: routes[0],
			},
			{
				path: '/foo/bar',
				params: {},
				route: routes[0].children[0],
			},
		]);
	});

	it('should follow nested routes with parameters', () => {
		const routes = [
			{
				path: '/foo/:bar',
				component: Null,
				children: [
					{
						path: ':qux',
						component: Null,
					},
				],
			},
		];
		expect(getAllMatchingRoutes('/foo/baz/qux', '', routes)).toEqual([
			{
				path: '/foo/baz',
				params: { bar: 'baz' },
				route: routes[0],
			},
			{
				path: '/foo/baz/qux',
				params: { qux: 'qux' },
				route: routes[0].children[0],
			},
		]);
	});

	it('should incorporate basepath', () => {
		const routes = [
			{
				path: '/foo',
				component: Null,
				children: [
					{
						path: 'bar',
						component: Null,
					},
				],
			},
		];
		const result = getAllMatchingRoutes('/baz/foo/bar', '/baz', routes);
		expect(result).toEqual([
			{
				path: '/baz/foo',
				params: {},
				route: routes[0],
			},
			{
				path: '/baz/foo/bar',
				params: {},
				route: routes[0].children[0],
			},
		]);
	});
});
