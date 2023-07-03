import { collection, schema } from '@lo-fi/web';
import cuid from 'cuid';

/**
 * Welcome to your lo-fi schema!
 *
 * The schema is where you define your data model.
 *
 * Read more at https://lo-fi.gfor.rest/docs/local-storage/schema
 *
 * The code below is provided as an example, but you'll
 * probably want to delete it and replace it with your
 * own schema.
 *
 * The schema is used to generate the client code for lo-fi.
 * After you've replaced this example schema, run `pnpm generate -f`
 * in the root directory to bootstrap your client.
 *
 * For subsequent changes to your schema, use just `pnpm generate`.
 */

const items = collection({
  name: 'item',
  primaryKey: 'id',
  fields: {
    id: {
      type: 'string',
      default: cuid,
    },
    content: {
      type: 'string',
      default: '',
    },
    done: {
      type: 'boolean',
      default: false,
    },
    createdAt: {
      type: 'number',
      default: () => Date.now(),
      indexed: true,
    },
  },
});

export default schema({
  version: 1,
  collections: {
    items,
  },
});
