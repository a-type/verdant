---
sidebar_position: 6
---

# React Router

A small, experimental, client-only router for React that includes cutting-edge Suspense and Concurrent Mode support. Designed to help your PWA feel like a native app, and integrate well with Verdant.

This router is stand-alone and doesn't rely on any other Verdant packages. Feel free to use it in any client-focused React app. Just know that it won't be as battle-tested as the still-excellent React Router.

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

Like React Router, `@verdant-web/react-router` comes with a Link component you use to render links.

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

### Scroll restoration

Scroll restoration is something you might overlook when integrating a router. And some routers do this for you automatically. But Verdant's router is pretty experimental, and scroll restoration is no exception. I tried to make it powerful and versatile.

To effectively restore scroll positions for navigation history, you'll need to either utilize the `RestoreScroll` component or the `useScrollRestoration` hook. The component is better for most use cases, but the hook exists for more complex scenarios (like animating scroll position, if you want to).

#### `<RestoreScroll />`

This component doesn't render any DOM, it invokes `useScrollRestoration` internally. You can render it anywhere, but I recommend putting it **inside a Suspense boundary alongside loaded data**. As soon as this component is mounted, it will restore scroll position to the recorded value for the current history item. It works best if the relevant data on the page has already been loaded, so that the UI is in the right configuration to restore scroll. Otherwise, you can get 'stuck' at 0 because there's not enough content to scroll the container.

You can capture the scroll position of a container besides the window by passing its ref to `scrollableRef`. This is helpful if your primary scroll container on the page is part of the app's UI.

#### `useScrollRestoration`

This hook takes two function parameters which allow you to customize the logic for recording and restoring scroll values.

`onGetScrollPosition` is called when the system wants to record scroll position. You can read the `scrollY` of the window, `scrollTop` of an element, or anything else you like.

This function should return a `[number,number]` tuple, or `false` if you don't want to register a new scroll position (the previous one, if any, will be retained).

`onScrollRestored` is called with a `[number,number]` tuple when scroll should be restored. Call `window.scrollTo`, `element.scrollTo`, or even animate the scroll value as you like.

## Advanced Usage

### Layout routes

You can create nested layers of routes, which means you can also create a layer which doesn't really 'consume' part of the path, but encapsulates a set of children in a meaningful way. These act as layout layers, providing some intermediate layer of UI which wraps any children.

I use this for delineating between pages which should or should not display common UI elements like navigation, like so:

```tsx
function LayoutWithNav() {
	return (
		<PageRoot>
			<Outlet />
			<Navigation />
		</PageRoot>
	);
}

const routes = [
	{
		path: '/some-page-without-nav',
		component: SomePageWithoutNav,
	},
	// any routes above this one will not have navigation by default
	{
		path: '/',
		component: LayoutWithNav,
		// all routes contained here have navigation and
		// common page layout
		children: [
			{
				index: true,
				component: HomePage,
			},
			{
				path: 'posts',
				component: PostsPage,
			},
		],
	},
];
```

### Parallel loading

`onVisited` is called as soon as a route is matched after a path change. This also **includes nested routes**. You can use this to load data or code in parallel with the new route.

#### Preloading lazy components

One big boost you can do is preloading the route components needed to render the pages the user might go to next.

To do this we need something a bit more than React's built-in `lazy`, because we want to pre-fetch the component code before rendering. I recommend [react-lazy-with-preload](https://github.com/ianschmitz/react-lazy-with-preload).

```tsx
const LazyPostsPage = lazyWithPreload(() => import('./PostsPage.jsx'));

const routes = [
	{
		path: '/',
		component: HomePage,
		// we think the user probably wants to load the Posts
		// page soon, so we preload it on visit
		onVisit: LazyPostsPage.preload,
	},
];
```

#### Preloading with Verdant queries

This is `@verdant-web/react-router`, after all, so you'd expect that preloading Verdant data should be easy.

Since all Verdant queries are cached, you can go ahead and run whatever query you anticipate using on a page. But since queries are disposed from the cache after a while if they aren't subscribed to, there are different techniques depending on which callback you use.

> Also note that these examples assume you have a single, global Verdant client instance. If you have different instances provided by different levels of React context, you won't be able to use this feature as it works currently, sorry. Consider using `onClick` handlers on individual links to call queries on the Verdant client you get from context instead.

For `onVisited`, since the route is mounting, you can probably just fire-and-forget your query.

```ts
{
  path: '/posts',
  onVisited: () => {
    client.posts.findAll();
  },
}
```

#### Preloading with your own data

Expect `onVisited` to be called multiple times! Any preloading logic you do should be idempotent. For example, cache preloaded data, and only load it if the cache is empty. Even better, store the promise for your loading procedure and use that as your indicator that loading has already started, even if it hasn't completed yet.

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

This isn't `@verdant-web/react-router` specific, but since Suspense is still not widely adopted as an end-user pattern, here's how you could integrate your preloaded data into your page component:

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

### Skipping transitions

Sometimes you do want to show a skeleton of the next page instead of waiting for everything to load. For example, if you create a new resource and immediately navigate to the editor screen, you don't want to instead sit on the list page and wait for the editor page to load, which would be a confusing UX.

Pass `skipTransition` to `Link`, or to the second parameter of the `navigate` callback you get from `useNavigate`, to skip the concurrent mode transitioning and instead immediately navigate and await loading states on the new page.

### Using navigation state

Pass `state` to a `Link` and this state will be added to the route state during navigation. You can also pass `state` to the `navigate` callback you get from `useNavigate`, in the second parameter.

This can be utilized in the `onNavigation` prop in `Router`, or the callback passed to `useOnLocationChange`.

### Route data

Each route has an optional `data` prop. Pack in any useful context data you may want to reference for different routes, it's up to you. You can then use the `useMatchingRoute` hook to retrieve the current route and its data. The route returned will depend on the level of the app you're in - higher-up nested components will get higher-up nested routes!

### Intercepting navigation

Provide an `onNavigation` prop to `Router` to globally intercept navigation. You can return `false` from this callback to cancel a navigation, while the path will still update to the new location. This probably has limited uses, but I'm considering using it to do transparent PWA updates during navigation when a new version of the service worker is available, by canceling navigation and reloading the page instead.

### Rendering non-matching routes

This router exposes some advanced tooling to render routes which _don't_ match the current URL. This is particularly useful for creating transitions during navigation or enabling swipe-gesture based navigation in mobile apps.

To render any route, use the `RouteByPath` component. It takes a path value which should match some routes in your router, and it will display the associated UI for those routes on any page.

As an example, if you were doing swipe navigation, you probably want to start rendering the upcoming page "to the side" as the user begins the gesture. After detecting the gesture has begun, you could render a `<RouteByPath>` for the next page in a positioned container offscreen and animate it moving as the user moves their finger. Once the gesture is complete, you can use `useNavigate` to perform the actual page change, at which point the primary `<Outlet />` will begin rendering the new page. You might then want to use `<RouteByPath>` to show the prior page as it animates out of frame if the swipe was not 100% across the screen.

Also useful for route transitions is the `useNextMatchingRoute` hook. This will return match information, including the route itself, for the 'next level down.' You can use this to create a transition root component which renders an Outlet as normal, but introspects the matching route with `useNextMatchingRoute` to observe when it changes and render transition animations from the prior to the new route (using `RouteByPath`). There's an example in the `demo` folder of the `react-router` package.

When I implemented swipe navigation in [Gnocchi](https://gnocchi.club), I specified "left" and "right" page paths in each top-level route's `data`, then utilized `useNextMatchingRoute` in a component that wrapped the initial `<Outlet />` to reference those paths and decide which routes to render during a gesture. There are still a few tricky things, like how to structure your page layout correctly to accommodate the animated containers, but the combination of `useNextMatchingRoute` and `RouteByPath` makes the route rendering portion fairly straightforward!
