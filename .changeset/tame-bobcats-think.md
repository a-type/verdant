---
'@verdant-web/persistence-sqlite': major
'@verdant-web/react': major
'@verdant-web/store': major
'@verdant-web/cli': major
---

Big client rewrite for far easier usage in plain TS!

This breaking change reworks the main Verdant client experience to no longer require awaiting an initialization step before using the client.

While the React hooks papered over this problem, it really caused the vanilla usage to suffer and limited the ways queries could be referenced in an app. This change brings all sorts of improvements to the usage of the Verdant Client, even in React apps.

## Breaking changes

To upgrade to this version, you need to install the latest versions of both `@verdant-web/store`, `@verdant-web/cli`, and (if using) `@verdant-web/react`.

Then, use the Verdant CLI to regenerate your client.

Client usage will change. `ClientDescriptor` is no longer used. Instead, replace any construction of your `Client` via `ClientDescriptor` with direct use of `Client` instead.

```ts
// old way
const clientDesc = new ClientDescriptor(options);
const client = await clientDesc.open();
```

becomes:

```ts
// new way
const client = new Client(options);
```

You can begin using your client immediately with no extra `await .open()` step.

Other than that, Client usage remains the same.

Finally, you now pass `client` to your React `Provider`, not a `ClientDescriptor`.

### Other changes

React hooks no longer suspend when calling `useClient()`, giving you direct and immediate access to your Client instance. `useClientUnsuspended()` is marked as deprecated and is no longer different from `useClient`.
