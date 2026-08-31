import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { PrismaAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/prisma/prisma-authentication.repository';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import type { SessionSnapshot } from '../../../src/modules/authentication/domain/types/authentication.types';
import {
  TEST_EMAIL,
  TEST_LATER,
  TEST_NOW,
  TEST_PASSWORD,
} from '../../test-kit/authentication.constants';

// AC-16 (refresh rotation + replay detection) and AC-17 (logout revokes the
// family) proven directly against real PostgreSQL through the Prisma
// repository/session store, complementing
// authentication-persistence.integration.spec.ts (kept separate to respect
// the max-lines-per-file gate).
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
      prisma.session.deleteMany({ where: { id: { in: createdSessionIds } } }),
      prisma.sessionFamily.deleteMany({
        where: { id: { in: createdFamilyIds } },
      }),
      prisma.localCredential.deleteMany({
        where: { userId: { in: createdUserIds } },
      }),
      prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }),
    ]);
    await prisma.$disconnect();
  });

  it('rotates a refresh token, revoking the old session and issuing a new one (AC-16 happy path)', async () => {
    const user = await createActiveUser();
    const initial = await createInitialSession(user.id);
    const rotated = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    createdSessionIds.push(rotated.id);

    await expect(rotate(initial, rotated, TEST_NOW)).resolves.toBe('ROTATED');
    await expect(findSession(initial.id)).resolves.toMatchObject({
      status: 'REVOKED',
    });
    await expect(findSession(rotated.id)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('detects refresh replay against PostgreSQL and revokes the whole family (AC-16 replay)', async () => {
    const user = await createActiveUser();
    const initial = await createInitialSession(user.id);
    const rotated = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    createdSessionIds.push(rotated.id);
    await rotate(initial, rotated, TEST_NOW);

    // Reuse of the already-invalidated refresh hash must revoke every
    // session in the family, including the one just issued by rotation.
    const replayAttempt = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    await expect(rotate(initial, replayAttempt, TEST_LATER)).resolves.toBe(
      'REPLAY',
    );
    await expect(findSession(rotated.id)).resolves.toMatchObject({
      status: 'REVOKED',
    });
  });

  it('lets only one concurrent refresh rotation win against real PostgreSQL OCC (AC-16 concurrency)', async () => {
    const user = await createActiveUser();
    const initial = await createInitialSession(user.id);
    const candidateA = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    const candidateB = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    createdSessionIds.push(candidateA.id, candidateB.id);

    const results = await Promise.all([
      rotate(initial, candidateA, TEST_NOW),
      rotate(initial, candidateB, TEST_NOW),
    ]);
    expect(results.filter((outcome) => outcome === 'ROTATED')).toHaveLength(1);
    expect(results.filter((outcome) => outcome !== 'ROTATED')).toHaveLength(1);
  });

  it('revokes a session family on logout and blocks further rotation (AC-17)', async () => {
    const user = await createActiveUser();
    const initial = await createInitialSession(user.id);
    await repository.withTransaction((transaction) =>
      transaction.revokeFamily(initial.familyId, TEST_NOW),
    );
    await expect(findSession(initial.id)).resolves.toMatchObject({
      status: 'REVOKED',
    });

    const postLogout = {
      ...sessionSnapshot(user.id, randomUUID()),
      familyId: initial.familyId,
    };
    // The refresh hash still matches a REVOKED session, so post-logout reuse
    // is rejected the same way replay is: never authorizing a new request.
    await expect(rotate(initial, postLogout, TEST_LATER)).resolves.toBe(
      'REPLAY',
    );
    await expect(findSession(initial.id)).resolves.toMatchObject({
      status: 'REVOKED',
    });
  });

  async function createInitialSession(
    userId: string,
  ): Promise<SessionSnapshot> {
    const session = sessionSnapshot(userId, randomUUID());
    createdSessionIds.push(session.id);
    createdFamilyIds.push(session.familyId);
    await repository.withTransaction((transaction) =>
      transaction.createSessionForActiveUser(session),
    );
    return session;
  }

  function rotate(
    current: SessionSnapshot,
    next: SessionSnapshot,
    now: Date,
  ): Promise<'ROTATED' | 'REPLAY' | 'INVALID'> {
    return repository.withTransaction((transaction) =>
      transaction.rotateSession(
        current.id,
        current.refreshTokenHash,
        next,
        now,
      ),
    );
  }

  function findSession(id: string) {
    return repository.withTransaction((transaction) =>
      transaction.findSessionById(id),
    );
  }

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

  function sessionSnapshot(userId: string, id: string): SessionSnapshot {
    return {
      id,
      familyId: randomUUID(),
      userId,
      authMethod: 'PASSWORD',
      accessTokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'a'),
      refreshTokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'b'),
      refreshExpiresAt: new Date(TEST_NOW.getTime() + 600_000),
      status: 'ACTIVE',
      createdAt: TEST_NOW,
      lastRefreshedAt: null,
      revokedAt: null,
    };
  }
}
