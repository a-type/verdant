export const version = 2;

export const up = [
	`ALTER TABLE "OperationHistory" ADD COLUMN "authz" TEXT DEFAULT NULL;`,
	`ALTER TABLE "DocumentBaseline" ADD COLUMN "authz" TEXT DEFAULT NULL;`,
];
