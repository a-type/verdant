import { Context } from '../context.js';

/** During migration, only a partial context is available */
export type OpenDocumentDbContext = Omit<Context, 'documentDb'>;
