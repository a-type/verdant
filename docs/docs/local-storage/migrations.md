---
sidebar_position: 3
---

# Migrations

Every schema change requires a migration, including the initial one. While CLI migration management is not yet completed, I recommend creating a `migrations` directory in your generated client directory and adding the initial migration for your schema manually in a file `v1.ts`:

```ts
// client/migrations/v1.ts

import { createDefaultMigration } from '@lo-fi/web';
import schema from '../../schema.ts';

export default createDefaultMigration(schema);
```

Then collect the migrations in order as an array to provide to the client:

```ts
// client/migrations.ts
import v1 from './migrations/v1.js';

export default [v1];
```

Work is planned for the CLI to create and maintain this file structure for you.

`createDefaultMigration` will just keep any existing documents in-place and create or delete any new or removed indexes. You can use this for your first version, and if you ever make a version that only adds or removes indexes.

If you change the shape of your data, though, you will need to write a full migration. Docs are todo on this, but the tool to do that is exported as `migrate` and takes a function where you run all of your data transformers using tools supplied in the first argument.
