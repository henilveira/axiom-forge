import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import { PrismaAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/prisma/prisma-authentication.repository';
import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import { TEST_NOW } from '../../test-kit/authentication.constants';

const databaseUrl = process.env['DATABASE_URL'];

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  it('BLOCKED AUTH-001 PostgreSQL: DATABASE_URL is required', () => {
    expect(databaseUrl).toBeUndefined();
    throw new Error(
      'BLOCKED AUTH-001 PostgreSQL: configure DATABASE_URL for challenge revocation integration',
    );
  });
} else {
  let prisma: PrismaClient | null = null;
  let repository: PrismaAuthenticationRepository;
  const createdUserIds: string[] = [];
  const createdChallengeIds: string[] = [];

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
    if (prisma === null) {
      return;
    }
    await prisma.$transaction([
      prisma.authenticationChallenge.deleteMany({
        where: { id: { in: createdChallengeIds } },
      }),
      prisma.localCredential.deleteMany({
        where: { userId: { in: createdUserIds } },
      }),
      prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }),
    ]);
    await prisma.$disconnect();
  });

  it('revokes an issued challenge with PostgreSQL CAS after delivery failure', async () => {
    if (prisma === null) {
      throw new Error('test-prisma-not-connected');
    }
    const userId = randomUUID();
    const challengeId = randomUUID();
    createdUserIds.push(userId);
    createdChallengeIds.push(challengeId);
    const user = UserAggregate.registerWithPassword(
      {
        id: userId,
        passwordHash: 'hash'.repeat(4),
        termsVersion: 'auth001-test',
        acceptedAt: TEST_NOW,
        occurredAt: TEST_NOW,
      },
      NormalizedEmail.from(`${userId}@example.test`),
    );
    await repository.withTransaction((transaction) =>
      transaction.createUser(user.snapshot),
    );
    await repository.withTransaction((transaction) =>
      transaction.saveChallenge({
        id: challengeId,
        purpose: 'MAGIC_LOGIN',
        digest: 'e'.repeat(64),
        userId,
        createdAt: TEST_NOW,
        expiresAt: new Date(TEST_NOW.getTime() + 600_000),
        status: 'ISSUED',
        consumedAt: null,
        stateDigest: null,
        nonceDigest: null,
      }),
    );

    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'USED'),
      ),
    ).resolves.toBe(false);
    const revocations = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
    ]);

    expect(revocations.filter((result) => result)).toHaveLength(1);
    await expect(
      prisma.authenticationChallenge.findUnique({
        where: { id: challengeId },
        select: { digest: true, status: true },
      }),
    ).resolves.toEqual({ digest: 'e'.repeat(64), status: 'REVOKED' });
    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
    ).resolves.toBe(false);
  });
}
