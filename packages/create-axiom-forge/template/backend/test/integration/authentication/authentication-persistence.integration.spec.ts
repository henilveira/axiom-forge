import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { PrismaAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/prisma/prisma-authentication.repository';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import {
  TEST_EMAIL,
  TEST_LATER,
  TEST_NOW,
  TEST_PASSWORD,
  TEST_SUBJECT,
} from '../../test-kit/authentication.constants';

const databaseUrl = process.env['DATABASE_URL'];

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  it('BLOCKED AUTH-001 PostgreSQL: DATABASE_URL is required', () => {
    expect('BLOCKED AUTH-001 PostgreSQL').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 PostgreSQL: configure DATABASE_URL for disposable PostgreSQL integration',
    );
  });
} else {
  let prisma: PrismaClient;
  let repository: PrismaAuthenticationRepository;
  const createdUserIds: string[] = [];
  const createdSessionIds: string[] = [];
  const createdFamilyIds: string[] = [];
  const createdChallengeIds: string[] = [];
  const createdLinkIds: string[] = [];

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
      repository = new PrismaAuthenticationRepository(prisma);
    } catch (error: unknown) {
      throw new Error(
        `BLOCKED AUTH-001 PostgreSQL: migration or Prisma real driver is unavailable: ${
          error instanceof Error ? error.message : 'unknown connection error'
        }`,
      );
    }
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.$transaction([
      prisma.pendingGoogleLink.deleteMany({
        where: { id: { in: createdLinkIds } },
      }),
      prisma.authenticationChallenge.deleteMany({
        where: { id: { in: createdChallengeIds } },
      }),
      prisma.session.deleteMany({ where: { id: { in: createdSessionIds } } }),
      prisma.sessionFamily.deleteMany({
        where: { id: { in: createdFamilyIds } },
      }),
      prisma.localCredential.deleteMany({
        where: { userId: { in: createdUserIds } },
      }),
      prisma.externalIdentity.deleteMany({
        where: { userId: { in: createdUserIds } },
      }),
      prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }),
    ]);
    await prisma.$disconnect();
  });

  it('applies the forward-only migration and persists the AUTH schema', async () => {
    const tables = await prisma.$queryRaw<
      Array<{ readonly table_name: string }>
    >`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('auth_users', 'auth_challenges', 'auth_pending_google_links', 'auth_outbox_messages', 'auth_inbox_messages', 'auth_google_oauth_transactions')
        ORDER BY table_name
      `;
    expect(tables.map((table) => table.table_name)).toEqual([
      'auth_challenges',
      'auth_google_oauth_transactions',
      'auth_inbox_messages',
      'auth_outbox_messages',
      'auth_pending_google_links',
      'auth_users',
    ]);
  });

  it('proves PostgreSQL OCC for disable/link snapshots and rejects stale writes', async () => {
    const user = await createActiveUser();
    const [disableSnapshot, staleSnapshot] = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.findUserById(user.id),
      ),
      repository.withTransaction((transaction) =>
        transaction.findUserById(user.id),
      ),
    ]);
    if (disableSnapshot === null || staleSnapshot === null) {
      throw new Error('test-user-snapshot-missing');
    }
    const disabled = UserAggregate.restore(disableSnapshot);
    disabled.disable();
    await expect(
      repository.withTransaction((transaction) =>
        transaction.updateUser(disabled.snapshot, disableSnapshot.status),
      ),
    ).resolves.toBe(true);

    const staleLink = UserAggregate.restore(staleSnapshot);
    staleLink.attachGoogleIdentity(
      TEST_SUBJECT,
      user.emailNormalized,
      TEST_LATER,
      'subject-fingerprint-auth001',
    );
    await expect(
      repository.withTransaction((transaction) =>
        transaction.updateUser(staleLink.snapshot, staleSnapshot.status),
      ),
    ).resolves.toBe(false);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.findUserById(user.id),
      ),
    ).resolves.toMatchObject({ status: 'DISABLED', version: 2 });
  });

  it('proves disabled users cannot create sessions', async () => {
    const user = await createActiveUser();
    const session = sessionSnapshot(user.id, randomUUID());
    createdSessionIds.push(session.id);
    createdFamilyIds.push(session.familyId);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.createSessionForActiveUser(session),
      ),
    ).resolves.toBe(true);

    // createSessionForActiveUser fences the user row by bumping its version,
    // so the disable write must target the post-session-creation snapshot.
    const refreshed = await repository.withTransaction((transaction) =>
      transaction.findUserById(user.id),
    );
    if (refreshed === null) {
      throw new Error('test-user-snapshot-missing');
    }
    const disabled = UserAggregate.restore(refreshed);
    disabled.disable();
    await expect(
      repository.withTransaction((transaction) =>
        transaction.updateUser(disabled.snapshot, refreshed.status),
      ),
    ).resolves.toBe(true);
    const next = sessionSnapshot(user.id, randomUUID());
    createdSessionIds.push(next.id);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.createSessionForActiveUser(next),
      ),
    ).resolves.toBe(false);
  });

  it('consumes challenges with PostgreSQL CAS so only one concurrent consumer wins', async () => {
    const user = await createActiveUser();
    const challengeId = randomUUID();
    const digest = 'c'.repeat(64);
    createdChallengeIds.push(challengeId);
    await repository.withTransaction((transaction) =>
      transaction.saveChallenge({
        id: challengeId,
        purpose: 'MAGIC_LOGIN',
        digest,
        userId: user.id,
        createdAt: TEST_NOW,
        expiresAt: new Date(TEST_NOW.getTime() + 600_000),
        status: 'ISSUED',
        consumedAt: null,
        stateDigest: null,
        nonceDigest: null,
      }),
    );
    const consumed = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(digest, 'MAGIC_LOGIN', TEST_LATER),
      ),
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(digest, 'MAGIC_LOGIN', TEST_LATER),
      ),
    ]);
    expect(consumed.filter((value) => value !== null)).toHaveLength(1);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(digest, 'MAGIC_LOGIN', TEST_LATER),
      ),
    ).resolves.toBeNull();
  });

  it('proves pending Google link consume/revoke/expiry CAS and retention', async () => {
    const user = await createActiveUser();
    const linkId = randomUUID();
    const expiresAt = new Date(TEST_NOW.getTime() + 60_000);
    createdLinkIds.push(linkId);
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink({
        id: linkId,
        version: 1,
        userId: user.id,
        subject: TEST_SUBJECT,
        email: user.emailNormalized,
        expiresAt,
        status: 'ACTIVE',
        consumedAt: null,
        revokedAt: null,
      }),
    );
    const consumed = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink(linkId, TEST_NOW),
      ),
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink(linkId, TEST_NOW),
      ),
    ]);
    expect(consumed.filter((value) => value !== null)).toHaveLength(1);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokePendingGoogleLink(linkId, TEST_LATER),
      ),
    ).resolves.toBe(false);

    const expiredId = randomUUID();
    createdLinkIds.push(expiredId);
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink({
        id: expiredId,
        version: 1,
        userId: user.id,
        subject: `${TEST_SUBJECT}-expired`,
        email: user.emailNormalized,
        expiresAt: TEST_NOW,
        status: 'ACTIVE',
        consumedAt: null,
        revokedAt: null,
      }),
    );
    await expect(
      repository.withTransaction((transaction) =>
        transaction.expirePendingGoogleLinks(TEST_LATER, 10),
      ),
    ).resolves.toBe(1);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.findPendingGoogleLink(expiredId),
      ),
    ).resolves.toMatchObject({ status: 'EXPIRED', version: 2 });
  });

  async function createActiveUser() {
    const id = randomUUID();
    const email = TEST_EMAIL.replace('@', `-${id}@`);
    const aggregate = UserAggregate.registerWithPassword(
      {
        id,
        passwordHash: TEST_PASSWORD,
        termsVersion: 'v1',
        acceptedAt: TEST_NOW,
        occurredAt: TEST_NOW,
      },
      NormalizedEmail.from(email),
    );
    aggregate.verifyEmail(TEST_NOW);
    await repository.withTransaction((transaction) =>
      transaction.createUser(aggregate.snapshot),
    );
    createdUserIds.push(id);
    return aggregate.snapshot;
  }

  function sessionSnapshot(userId: string, id: string) {
    return {
      id,
      familyId: randomUUID(),
      userId,
      authMethod: 'PASSWORD' as const,
      accessTokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'a'),
      refreshTokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'b'),
      refreshExpiresAt: new Date(TEST_NOW.getTime() + 600_000),
      status: 'ACTIVE' as const,
      createdAt: TEST_NOW,
      lastRefreshedAt: null,
      revokedAt: null,
    };
  }
}
