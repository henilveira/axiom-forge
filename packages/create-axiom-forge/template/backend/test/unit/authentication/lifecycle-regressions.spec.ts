import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { InMemoryGoogleTransactionStore } from '../../../src/modules/authentication/infrastructure/external/google/in-memory-google-transaction.store';
import type { GoogleAuthorizationRequest } from '../../../src/modules/authentication/application/ports/google-oidc.port';
import {
  TEST_BROWSER_BINDING,
  TEST_CORRELATION_ID,
  TEST_EMAIL,
  TEST_LATER,
  TEST_NOW,
  TEST_PASSWORD,
  TEST_PENDING_LINK_ID,
  TEST_SUBJECT,
  TEST_USER_ID,
  TEST_FAMILY_ID,
} from '../../test-kit/authentication.constants';

function activeUser() {
  const user = UserAggregate.registerWithPassword(
    {
      id: TEST_USER_ID,
      passwordHash: 'hash'.repeat(16),
      termsVersion: 'v1',
      acceptedAt: TEST_NOW,
      occurredAt: TEST_NOW,
    },
    NormalizedEmail.from(TEST_EMAIL),
  );
  user.verifyEmail(TEST_NOW);
  return user.snapshot;
}

const googleTransaction: GoogleAuthorizationRequest = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=s',
  state: 'state-auth001',
  nonce: 'nonce-auth001',
  codeVerifier: 'verifier-auth001',
  expiresAt: new Date(TEST_NOW.getTime() + 600_000),
  browserBinding: TEST_BROWSER_BINDING,
  correlationId: TEST_CORRELATION_ID,
};

describe('AUTH-001 lifecycle and replay regressions', () => {
  it('does not create a session for a disabled or unverified user', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const pending = UserAggregate.registerWithPassword(
      {
        id: '00000000-0000-4000-8000-000000000304',
        passwordHash: TEST_PASSWORD,
        termsVersion: 'v1',
        acceptedAt: TEST_NOW,
        occurredAt: TEST_NOW,
      },
      NormalizedEmail.from('auth001-unverified@example.test'),
    );
    repository.createUser(pending.snapshot);
    const pendingSessionCreated = await repository.withTransaction(
      (transaction) =>
        transaction.createSessionForActiveUser(
          sessionFor(TEST_USER_ID, '00000000-0000-4000-8000-000000000301'),
        ),
    );
    expect(pendingSessionCreated).toBe(false);

    const activeSnapshot = activeUser();
    repository.createUser(activeSnapshot);
    const active = UserAggregate.restore(activeSnapshot);
    active.disable();
    expect(
      await repository.withTransaction((transaction) =>
        transaction.updateUser(active.snapshot, 'ACTIVE'),
      ),
    ).toBe(true);
    expect(
      await repository.withTransaction((transaction) =>
        transaction.createSessionForActiveUser(
          sessionFor(TEST_USER_ID, '00000000-0000-4000-8000-000000000302'),
        ),
      ),
    ).toBe(false);
  });

  it('consumes, revokes and expires pending Google links with terminal states', async () => {
    const repository = new InMemoryAuthenticationRepository();
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink({
        id: TEST_PENDING_LINK_ID,
        version: 1,
        userId: TEST_USER_ID,
        subject: TEST_SUBJECT,
        email: TEST_EMAIL,
        expiresAt: new Date(TEST_NOW.getTime() + 60_000),
        status: 'ACTIVE',
        consumedAt: null,
        revokedAt: null,
      }),
    );

    const consumed = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink(TEST_PENDING_LINK_ID, TEST_NOW),
      ),
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink(TEST_PENDING_LINK_ID, TEST_NOW),
      ),
    ]);
    expect(consumed.filter((value) => value !== null)).toHaveLength(1);
    expect(
      repository.findPendingGoogleLink(TEST_PENDING_LINK_ID),
    ).toMatchObject({ status: 'CONSUMED', version: 2 });
    expect(
      await repository.withTransaction((transaction) =>
        transaction.revokePendingGoogleLink(TEST_PENDING_LINK_ID, TEST_LATER),
      ),
    ).toBe(false);

    const expiredId = '00000000-0000-4000-8000-000000000303';
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink({
        id: expiredId,
        version: 1,
        userId: TEST_USER_ID,
        subject: TEST_SUBJECT,
        email: TEST_EMAIL,
        expiresAt: TEST_NOW,
        status: 'ACTIVE',
        consumedAt: null,
        revokedAt: null,
      }),
    );
    expect(
      await repository.withTransaction((transaction) =>
        transaction.expirePendingGoogleLinks(TEST_LATER, 1),
      ),
    ).toBe(1);
    expect(repository.findPendingGoogleLink(expiredId)).toMatchObject({
      status: 'EXPIRED',
      version: 2,
    });
    expect(repository.findPendingGoogleLink(expiredId)).not.toBeNull();
  });

  it('consumes OAuth state once and rejects replay and expiry', () => {
    const transactions = new InMemoryGoogleTransactionStore();
    transactions.save(googleTransaction);
    expect(transactions.consume(googleTransaction.state, TEST_NOW)).toEqual(
      googleTransaction,
    );
    expect(transactions.consume(googleTransaction.state, TEST_NOW)).toBeNull();

    const expired = {
      ...googleTransaction,
      state: 'expired-state-auth001',
      expiresAt: TEST_NOW,
    };
    transactions.save(expired);
    expect(transactions.consume(expired.state, TEST_LATER)).toBeNull();
  });
});

function sessionFor(userId: string, id: string) {
  return {
    id,
    familyId: TEST_FAMILY_ID,
    userId,
    authMethod: 'PASSWORD' as const,
    accessTokenHash: 'a'.repeat(64),
    refreshTokenHash: 'b'.repeat(64),
    refreshExpiresAt: new Date(TEST_NOW.getTime() + 60_000),
    status: 'ACTIVE' as const,
    createdAt: TEST_NOW,
    lastRefreshedAt: null,
    revokedAt: null,
  };
}
