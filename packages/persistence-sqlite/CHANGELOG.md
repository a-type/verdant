# @verdant-web/persistence-sqlite

## 4.0.0

### Major Changes

- 1209a38: Big client rewrite for far easier usage in plain TS!

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

### Patch Changes

- Updated dependencies [1209a38]
  - @verdant-web/store@5.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [f2193b5]
  - @verdant-web/store@4.3.0

## 2.0.0

### Patch Changes

- Updated dependencies [c793e54]
  - @verdant-web/store@4.2.0

## 1.0.0

### Patch Changes

- 7bc6069f: remove references to node modules in sqlite libs
- 9fbf4166: Try a different approach
- e3d304a8: Manually invoke abort controller
- 16243363: This is ridiculous!
- 87aa284a: Ignore illegal invocation error from abort controller
- 867d4cb6: Just stop aborting the thing I guess
- e319c589: Add extra check
- e0a6a919: Sometimes you think you know javascript, but
- Updated dependencies [9fbf4166]
- Updated dependencies [e3d304a8]
- Updated dependencies [21357127]
- Updated dependencies [16243363]
- Updated dependencies [87aa284a]
- Updated dependencies [867d4cb6]
- Updated dependencies [ddc1a25b]
- Updated dependencies [b5d15631]
- Updated dependencies [e319c589]
- Updated dependencies [e0a6a919]
  - @verdant-web/store@4.1.0

## 1.0.0-alpha.10

### Patch Changes

- 867d4cb6: Just stop aborting the thing I guess
- Updated dependencies [867d4cb6]
  - @verdant-web/store@4.1.0-alpha.8

## 1.0.0-alpha.9

### Patch Changes

- e0a6a919: Sometimes you think you know javascript, but
- Updated dependencies [e0a6a919]
  - @verdant-web/store@4.1.0-alpha.7

## 1.0.0-alpha.8

### Patch Changes

- 16243363: This is ridiculous!
- Updated dependencies [16243363]
  - @verdant-web/store@4.1.0-alpha.6

## 1.0.0-alpha.7

### Patch Changes

- 9fbf4166: Try a different approach
- Updated dependencies [9fbf4166]
  - @verdant-web/store@4.1.0-alpha.5

## 1.0.0-alpha.6

### Patch Changes

- e3d304a8: Manually invoke abort controller
- Updated dependencies [e3d304a8]
  - @verdant-web/store@4.1.0-alpha.4

## 1.0.0-alpha.5

### Patch Changes

- e319c589: Add extra check
- Updated dependencies [e319c589]
  - @verdant-web/store@4.1.0-alpha.3

## 1.0.0-alpha.4

### Patch Changes

- 87aa284a: Ignore illegal invocation error from abort controller
- Updated dependencies [87aa284a]
  - @verdant-web/store@4.1.0-alpha.2

## 1.0.0-alpha.3

### Patch Changes

- 7bc6069f: remove references to node modules in sqlite libs

## 1.0.0-alpha.2

### Patch Changes

- Updated dependencies [b5d15631]
  - @verdant-web/store@4.1.0-alpha.0
