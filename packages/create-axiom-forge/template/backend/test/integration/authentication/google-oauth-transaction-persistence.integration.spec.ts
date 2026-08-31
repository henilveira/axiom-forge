import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../src/generated/prisma/client';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import { PrismaGoogleTransactionStore } from '../../../src/modules/authentication/infrastructure/external/google/prisma-google-transaction.store';
import { GoogleOAuthTransactionSealer } from '../../../src/modules/authentication/infrastructure/external/google/google-transaction.sealer';
import { TEST_LATER, TEST_NOW } from '../../test-kit/authentication.constants';

const databaseUrl = process.env['DATABASE_URL'];
const googleTransactionSecret =
  'google-oauth-transaction-integration-secret-32-bytes';

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  it('BLOCKED AUTH-001 PostgreSQL: DATABASE_URL is required', () => {
    expect('BLOCKED AUTH-001 PostgreSQL').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 PostgreSQL: configure DATABASE_URL for disposable PostgreSQL integration',
    );
  });
} else {
  let prisma: PrismaClient;
  const sealer = new GoogleOAuthTransactionSealer(googleTransactionSecret);

  beforeAll(async () => {
    try {
      execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['prisma', 'migrate', 'deploy'],
        {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'pipe',
        },
      );
      prisma = createProductionPrismaClient(databaseUrl);
      await prisma.$connect();
    } catch (error: unknown) {
      throw new Error(
        `BLOCKED AUTH-001 PostgreSQL: migration or Prisma real driver is unavailable: ${
          error instanceof Error ? error.message : 'unknown connection error'
        }`,
      );
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('stores no OAuth challenge plaintext and consumes the row only once', async () => {
    const store = new PrismaGoogleTransactionStore(
      prisma,
      googleTransactionSecret,
    );
    const state = `state-${randomUUID()}`;
    const transaction = {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=x',
      state,
      nonce: `nonce-${randomUUID()}`,
      codeVerifier: `verifier-${randomUUID()}`,
      expiresAt: new Date(TEST_NOW.getTime() + 60_000),
      browserBinding: 'browser-fingerprint-auth001',
      correlationId: randomUUID(),
    };
    await store.save(transaction);
    const persisted = await prisma.googleOAuthTransaction.findUnique({
      where: { stateHash: sealer.stateHash(state) },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.stateHash).not.toContain(state);
    expect(persisted?.sealedPayload).not.toContain(state);
    expect(persisted?.sealedPayload).not.toContain(transaction.nonce);
    expect(persisted?.sealedPayload).not.toContain(transaction.codeVerifier);
    expect(persisted?.sealedPayload).not.toContain(
      transaction.authorizationUrl,
    );

    const consumed = await Promise.all([
      store.consume(state, TEST_NOW),
      store.consume(state, TEST_NOW),
    ]);
    expect(consumed.filter((value) => value !== null)).toHaveLength(1);
    expect(consumed.find((value) => value !== null)).toMatchObject(transaction);
    await expect(
      prisma.googleOAuthTransaction.findUnique({
        where: { stateHash: sealer.stateHash(state) },
      }),
    ).resolves.toBeNull();
  });

  it('retains the legacy relation while exposing only sealed columns to runtime', async () => {
    const tables = await prisma.$queryRaw<Array<{ tableName: string }>>(
      Prisma.sql`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'auth_google_oauth_transactions',
            'auth_google_oauth_transactions_legacy'
          )
      `,
    );
    expect(
      tables
        .map(({ tableName }) => tableName)
        .sort((left, right) => left.localeCompare(right)),
    ).toEqual([
      'auth_google_oauth_transactions',
      'auth_google_oauth_transactions_legacy',
    ]);

    const legacyColumns = await prisma.$queryRaw<Array<{ columnName: string }>>(
      Prisma.sql`
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_google_oauth_transactions_legacy'
        ORDER BY ordinal_position
      `,
    );
    expect(legacyColumns.map(({ columnName }) => columnName)).toEqual([
      'state',
      'nonce',
      'code_verifier',
      'browser_binding',
      'correlation_id',
      'authorization_url',
      'created_at',
      'expires_at',
    ]);

    const sealedColumns = await prisma.$queryRaw<Array<{ columnName: string }>>(
      Prisma.sql`
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_google_oauth_transactions'
        ORDER BY ordinal_position
      `,
    );
    expect(sealedColumns.map(({ columnName }) => columnName)).toEqual([
      'state_hash',
      'sealed_payload',
      'created_at',
      'expires_at',
    ]);
  });

  it('preserves TTL rejection for expired sealed transactions', async () => {
    const store = new PrismaGoogleTransactionStore(
      prisma,
      googleTransactionSecret,
    );
    const state = `state-${randomUUID()}`;
    await store.save({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=y',
      state,
      nonce: `nonce-${randomUUID()}`,
      codeVerifier: `verifier-${randomUUID()}`,
      expiresAt: TEST_NOW,
      browserBinding: 'browser-fingerprint-auth001',
      correlationId: randomUUID(),
    });
    await expect(store.consume(state, TEST_LATER)).resolves.toBeNull();
    await prisma.googleOAuthTransaction.deleteMany({
      where: { stateHash: sealer.stateHash(state) },
    });
  });
}
