# @verdant-web/react-router

## 0.3.1

### Patch Changes

- b4a4803: Fix more path resolution errors

## 0.3.0

### Minor Changes

- 2494e71: Breaking change to router: [perf] remove onAccessible callback in routes

  This feature was simply bad for performance and scalability as the number of routes grew, since each Link had to traverse the entire route tree on mount. This created an exponential slowdown between number of links on the page and number of routes.

  If you want to preload data for routes the user may visit from the current page, use `onVisited` on that page and your own judgment on what to preload.

### Patch Changes

- b2a9fcd: Fix useMatch

## 0.2.5

### Patch Changes

- 9ab6d86: Fix absolute paths for RouteByPath

## 0.2.4

### Patch Changes

- c2c64a5: Fix more errors with RouteByPath

## 0.2.3

### Patch Changes

- 85920e1: Resolve relative paths in RouteByPath

## 0.2.2

### Patch Changes

- c177778: Fix params on useNextMatchingRoute to incorporate parent route params

## 0.2.1

### Patch Changes

- 2bd2c98: Add arbitrary data to routes

## 0.2.0

### Minor Changes

- f081d74: Add tools for route transition animations, like manual control of rendering routes even if they don't match the path

## 0.1.6

### Patch Changes

- 1dafc21: Add built-in preserve query prop to Link

## 0.1.5

### Patch Changes

- 53d0c1e: add hook to get currently matching routes
- db43f41: Rename framework to "Verdant"

## 0.1.4

### Patch Changes

- a5409a9: Fix some structural mistakes

## 0.1.3

### Patch Changes

- 5aefdbe: Support modifying old search params

## 0.1.2

### Patch Changes

- ce84f5f: Support nested params

## 0.1.1

### Patch Changes

- a947246: Initial release of router
