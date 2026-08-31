import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client';

/**
 * Builds a production PrismaClient wired with the approved `@prisma/adapter-pg`
 * driver adapter. Prisma 7's `prisma-client` generator requires a driver
 * adapter at runtime; without one `new PrismaClient()` throws unconditionally.
 * This is the single call site the production composition root uses when no
 * Prisma client is injected explicitly.
 */
export function createProductionPrismaClient(
  databaseUrl: string,
): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
