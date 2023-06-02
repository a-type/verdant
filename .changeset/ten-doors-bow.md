---
'@verdant-web/cli': minor
'@verdant-web/store': minor
'@verdant-web/common': minor
---

New migration features: shortcut migrations, auto-migration

## Shortcut migrations

You can skip versions when creating migrations, effectively deprecating ranges of versions which you believe no existing clients utilize anymore. This should be done with care!

You can also use shortcut migrations to create a parallel path from one version to another which skips intermediate versions, reducing the number of migrations new clients have to make to reach the current version.

See the [docs](https://verdant.dev/docs/local-storage/migrations) for more!

## Auto-migration

Schema migrations now automatically apply simple changes without you having to write any migration logic. Changes supported are:

- Adding indexes
- Changing indexes
- Removing indexes
- Adding default values to fields or sub-fields
- Removing fields or sub-fields

If your schema changes fall within these categories, you don't have to write any migration logic! Just leave the generated file in-place.
