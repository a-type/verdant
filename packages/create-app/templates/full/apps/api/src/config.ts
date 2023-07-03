export const verdantDbFile = process.env.VERDANT_DB_FILE!;
if (!verdantDbFile) {
	throw new Error('VERDANT_DB_FILE env var is required');
}
export const verdantSecret = process.env.VERDANT_SECRET!;
if (!verdantSecret) {
	throw new Error('VERDANT_SECRET env var is required');
}
export const verdantFileStorageRoot =
	process.env.VERDANT_FILE_STORAGE_ROOT || './files';
export const port = process.env.PORT || 3001;
export const serverHost = process.env.HOST || `http://localhost:${port}`;
export const uiHost = process.env.UI_HOST || 'http://localhost:3000';
export const sessionSecret = process.env.SESSION_SECRET!;
if (!sessionSecret) {
	throw new Error('SESSION_SECRET env var is required');
}

export const googleAuthClientId = process.env.GOOGLE_AUTH_CLIENT_ID!;
if (!googleAuthClientId) {
	throw new Error('GOOGLE_AUTH_CLIENT_ID env var is required');
}
export const googleAuthClientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET!;
if (!googleAuthClientSecret) {
	throw new Error('GOOGLE_AUTH_CLIENT_SECRET env var is required');
}

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
if (!stripeSecretKey) {
	throw new Error('STRIPE_SECRET_KEY env var is required');
}

export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!stripeWebhookSecret) {
	throw new Error('STRIPE_WEBHOOK_SECRET env var is required');
}
