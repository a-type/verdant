---
sidebar_position: 6
---

# React Router

A small, experimental, client-only router for React that includes cutting-edge Suspense and Concurrent Mode support. Designed to help your PWA feel like a native app, and integrate well with lo-fi.

This router is stand-alone and doesn't rely on any other lo-fi packages. Feel free to use it in any client-focused React app. Just know that it won't be as battle-tested as the still-excellent React Router.

## Usage

Routes are defined in a tree data structure, not React components. This was done because, while declarative components for routes are fun, they'd require extra, complicated plumbing to integrate well with the other key features.

Create your routes by calling `makeRoutes`, which provides typechecking for route contents.

You pass your routes to the `Router` component. Inside `Router`, you can continue building up your global app UI structure. Render an `Outlet` wherever you want to show your route content.

```tsx
const routes = makeRoutes([
	{
		path: '/',
		exact: true,
		component: HomePage,
	},
	{
		path: '/posts',
		component: lazy(() => import('./PostsPage.tsx')),
	},
]);

<Router routes={routes}>
	<main>
		<nav>...</nav>
		<div>
			<Suspense>
				<Outlet />
			</Suspense>
		</div>
	</main>
</Router>;
```

If you define your routes outside the `routes` prop, you may want to wrap them in `makeRoutes` to cast to the right typing.

### Suspense support

You'll probably want a top-level Suspense boundary. This will make it easy to utilize `lazy` components (code splitting) for routes.

### Route options

Each route can have more advanced options, including children.

```tsx
{
  path: '/posts',
  exact: false, // optional. only match a complete path
  component: PostsPage,
  onAccessible: async (params) => {
    // preload UI or data for your route whenever a link
    // to it is present in the current interface

    // you can return a cleanup function which is called
    // if the link unmounts without being clicked
    return () => {};
  },
  onVisited: async (params) => {
    // preload data your route will need as soon as it
    // is mounted. this runs in parallel with any
    // lazy component loading
  },
  children: [
    {
      // match a path parameter and it will be passed
      // by name to your onAccessible/onVisited callbacks
      // and returned by useParams()
      path: ':id',
      component: PostPage,
    }
  ]
}
```

### Links

Like React Router, `@lo-fi/react-router` comes with a Link component you use to render links.

Unlike React Router, this component also does external links explicitly, and comes with a `newTab` parameter for easy new-tabbing. Because I always end up reinventing these features in a wrapped Link component, anyway.

```tsx
<Link to="/posts/1">Post 1</Link>
<Link to="https://google.com" newTab>Google</Link>
<Link to="mailto://hi@you.site">Contact me</Link>
// newTab on local paths opts out of router features
<Link to="/tos" newTab>Terms of Service</Link>
// use "external" to force router features on or off if you need to
<Link to="https://still-this-site/posts/1" external={false}>Why</Link>
```

### Outlet

Outlet is a 'slot' component that stands in for the matching route content of this nested routing level. Render an Outlet wherever you want your route UI to show up.

Outlets let you define "fixed" UI surrounding your route UI which doesn't change between routes.

For example, on the `/` page, this structure

```tsx
<main>
	<Navigation />
	<Outlet />
</main>
```

is, for all intents and purposes,

```tsx
<main>
	<Navigation />
	<HomePage />
</main>
```

If you have nested routes, the parent routes must render `<Outlet />`, or they won't be shown.

### Showing a loader during long page transitions

One of the core features of this router is Suspense and Concurrent Mode support, which means when a user clicks a Link, the router will load the code necessary to render the next page before actually changing the UI. This mimics "native-like" behavior and makes your app feel more seamless, with fewer empty loading states.

However, if it takes a long time to preload the next page, it might not look like clicking the link did anything! So this router provides some tools to help you provide user feedback during a longer page load.

You can wrap a global loader (like a progress bar at the top of the page) with `TransitionIndicator` to show it during transitions, or you can call `useIsRouteTransitioning` to get a boolean to use however you like.

Both of these accept a `delay` parameter, which will delay turning the transition on for some amount of time, to prevent flickering during quick navigations.

```tsx
<TransitionIndicator delay={300}>
	<GlobalSpinner />
</TransitionIndicator>
```

```tsx
const isNavigating = useIsRouteTransitioning(300);
```

Additionally, the Link component receives a `data-transitioning` attribute when it's clicked, until the navigation is complete. You can use this to immediately provide styling feedback when the user clicks a link.

### Other basic tools

#### `useNavigate()`

For programmatic navigation without `Link`. Returns a callback you can use to manually navigate to a path. Pass `{ replace: true }` to the second parameter to replace instead of pushing state.

#### `useMatch({ path, end })`

Determine if the current route matches a path you provide. For example, you might want to know if the app is on the `/pages/1` page. You could pass `useMatch({ path: '/pages/1' })`. Or perhaps you want to know if it's on `/pages`, but not `/pages/1`. In that case, pass `end: true` to indicate it should not match sub-routes.

#### `useSearchParams()`

Although search params aren't included in routing logic, React Router set the standard for including them as part of a router's toolkit, so I've likewise exported a `useSearchParams` which acts like a `useState` for `URLSearchParams`, writing to and reading from the query string.

```ts
const [params, setParams] = useSearchParams();
setParams((old) => {
	old.delete('foo');
	return old;
});
```

### Scrolling to top

Yeah, so, I'll get to this eventually?

For now, you can call `window.scrollTo(0, 0)` in all the `onVisited` callbacks you want this for. I know. I'll look into making this a default behavior.

## Advanced Usage: Preloading

### Preloading and parallel loading

`onAccessible` is called every time a `Link` is mounted which links to the route, **including nested routes**. For example, if you're on `/` and there's a link to `/posts/1`, the `/posts` route **and** the `/posts/:id` route will have `onAccessible` called.

`onVisited` is called as soon as a route is matched after a path change. This also **includes nested routes**.

#### Preloading lazy components

One big boost you can get from `onAccessible` is preloading the route components needed to render the pages the user might go to next.

To do this we need something a bit more than React's built-in `lazy`, because we want to pre-fetch the component code before rendering. I recommend [react-lazy-with-preload](https://github.com/ianschmitz/react-lazy-with-preload).

```tsx
const LazyPostsPage = lazyWithPreload(() => import('./PostsPage.jsx'));

const routes = [
	{
		path: '/posts',
		component: LazyPostsPage,
		onAccessible: LazyPostsPage.preload,
	},
];
```

#### Preloading with lo-fi queries

This is `@lo-fi/react-router`, after all, so you'd expect that preloading lo-fi data should be easy.

Since all lo-fi queries are cached, you can go ahead and run whatever query you anticipate using on a page. But since queries are disposed from the cache after a while if they aren't subscribed to, there are different techniques depending on which callback you use.

> Also note that these examples assume you have a single, global lo-fi client instance. If you have different instances provided by different levels of React context, you won't be able to use this feature as it works currently, sorry. Consider using `onClick` handlers on individual links to call queries on the lo-fi client you get from context instead.

For `onVisited`, since the route is mounting, you can probably just fire-and-forget your query.

```ts
{
  path: '/posts',
  onVisited: () => {
    client.posts.findAll();
  },
}
```

For `onAccessible`, it might be a little longer between the time your query is preloaded, and when the route is shown (if ever). The query will likely be cleaned up before it can be useful. I'd recommend just using `onVisited` in most cases, but if you really need to start preloading a query on the previous page, you can go ahead and subscribe it and return the unsubscribe.

```ts
{
  path: '/posts',
  onAccessible: () => {
    const query = client.posts.findAll();
    // the subscriber is just a no-op
    return query.subscribe(() => {});
  }
}
```

#### Preloading with your own data

Expect `onAccessible` and `onVisited` to be called multiple times! Any preloading logic you do should be idempotent. For example, cache preloaded data, and only load it if the cache is empty. Even better, store the promise for your loading procedure and use that as your indicator that loading has already started, even if it hasn't completed yet.

```ts
// this is just a rough idea, you might find a better way...
const preloadPromises = new Map<string, Promise<Data>>();
const preloadedData = new Map<string, Data>();

function preload(key: string) {
	if (preloadedData.has(key)) return preloadedData.get(key);
	if (preloadPromises.has(key)) return preloadPromises.get(key);
	const preloadPromise = loadData(key);
	preloadPromises.set(key, preloadPromise);
	preloadPromise.then((data) => {
		preloadedData.set(key, data);
		preloadPromises.delete(key);
	});
	return preloadPromise;
}
```

Hopefully you see what I'm going for, here. If the data is already loaded or is in flight, we bail out. Otherwise, we load it and cache it.

#### Integrating preloaded data with Suspense

This isn't `@lo-fi/react-router` specific, but since Suspense is still not widely adopted as an end-user pattern, here's how you could integrate your preloaded data into your page component:

```tsx
function PostPage() {
	const { id } = useParams<{ id: string }>();
	const data = preloadedData.get(id);
	if (!data) {
		throw preload(id);
	}

	return (
		<article>
			<h1>{data.title}</h1>
		</article>
	);
}
```

With Suspense, our component can `throw` a promise if the data isn't loaded yet. React will wait for the promise to resolve, then try re-rendering the component again. **You must make sure the component doesn't throw again after the preload completes.** That's why `preload` returns early if the cached data is found.

Of course, you may never need to use this low-level Suspense functionality, but that's how you do it, if you're curious!
