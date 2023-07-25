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
		expect(matchPath('/foo', route)).toEqual({
			path: '/foo',
			params: {},
			route,
			remainingPath: '',
		});
	});

	it('should match simple, non-exact non-param routes', () => {
		const route = {
			path: '/foo',
			component: Null,
		};
		expect(matchPath('/foo/bar', route)).toEqual({
			path: '/foo',
			params: {},
			route,
			remainingPath: '/bar',
		});
	});

	it('should match exact routes with parameters', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/baz', route)).toEqual({
			path: '/foo/baz',
			params: { bar: 'baz' },
			route,
			remainingPath: '',
		});
	});

	it('should match non-exact routes with parameters', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
		};
		expect(matchPath('/foo/baz/qux', route)).toEqual({
			path: '/foo/baz',
			params: { bar: 'baz' },
			route,
			remainingPath: '/qux',
		});
	});

	it('should not match exact routes if path is longer', () => {
		const route = {
			path: '/foo',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/bar', route)).toEqual(null);
	});

	it('should not match exact routes with parameters if path is longer', () => {
		const route = {
			path: '/foo/:bar',
			component: Null,
			exact: true,
		};
		expect(matchPath('/foo/baz/bop', route)).toEqual(null);
	});
});

describe('getBestRouteMatch', () => {
	it('should return null if no routes match', () => {
		expect(getBestRouteMatch('/foo', [])).toEqual(null);
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
		expect(getBestRouteMatch('/foo/bar', routes)).toEqual({
			path: '/foo',
			params: {},
			route: routes[0],
			remainingPath: '/bar',
		});
	});

	it('should work with wildcards', () => {
		const routes = [
			{
				path: '*',
				component: Null,
			},
		];
		expect(getBestRouteMatch('/foo', routes)).toEqual({
			path: '/foo',
			params: {},
			route: routes[0],
			remainingPath: '',
		});
	});
});

describe('getAllMatchingRoutes', () => {
	it('should return empty array if no routes match', () => {
		expect(getAllMatchingRoutes('/foo', [])).toEqual([]);
	});

	it('should follow a simple nested route path', () => {
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
		expect(getAllMatchingRoutes('/foo/bar', routes)).toEqual([
			{
				path: '/foo',
				params: {},
				route: routes[0],
				remainingPath: '/bar',
			},
			{
				path: '/bar',
				params: {},
				route: routes[0].children[0],
				remainingPath: '',
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
		expect(getAllMatchingRoutes('/foo/bar', routes)).toEqual([
			{
				path: '/foo',
				params: {},
				route: routes[0],
				remainingPath: '/bar',
			},
			{
				path: '/bar',
				params: {},
				route: routes[0].children[0],
				remainingPath: '',
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
		expect(getAllMatchingRoutes('/foo/baz/qux', routes)).toEqual([
			{
				path: '/foo/baz',
				params: { bar: 'baz' },
				route: routes[0],
				remainingPath: '/qux',
			},
			{
				path: '/qux',
				params: { qux: 'qux' },
				route: routes[0].children[0],
				remainingPath: '',
			},
		]);
	});

	it('should handle layout routes', () => {
		const routes = [
			{
				path: '/',
				component: Null,
				children: [
					{
						path: 'foo',
						component: Null,
					},
					{
						path: '',
						component: Null,
					},
				],
			},
		];

		expect(getAllMatchingRoutes('/foo', routes)).toEqual([
			{
				path: '/',
				params: {},
				route: routes[0],
				remainingPath: '/foo',
			},
			{
				path: '/foo',
				params: {},
				route: routes[0].children[0],
				remainingPath: '',
			},
		]);
	});
});
