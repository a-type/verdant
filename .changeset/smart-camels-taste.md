---
'@lo-fi/cli': major
'@lo-fi/web': major
'@lo-fi/common': minor
'@lo-fi/react': minor
---

New queries, including paginated queries.

The query system has been revamped to allow for pagination, more intentional caching, and lazy-loading results.

For the most part, existing `get`, `findOne`, and `findAll` queries work the same as before. However, note that they will not longer eagerly fetch results on creation; you must access `.resolved` or call `.subscribe` to trigger the initial query.

There are two new queries, `getAllInfinite` and `getPage`, which load paginated subsets of the results. You can read about how to use these new queries in the docs.

This is a major version change for `web` because even the small inconsistencies like lazy-loading may cause unforeseen issues in existing codebases. Please upgrade and test functionality carefully. `cli` has also been major-bumped to go along with `web` since it now generates code that relies on `web`'s new functionality.
