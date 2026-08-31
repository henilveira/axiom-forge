import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import type { PendingGoogleLink } from '../../../src/modules/authentication/application/ports/authentication-repository.port';
import { CleanupPendingGoogleLinksJob } from '../../../src/modules/authentication/application/jobs/cleanup-pending-google-links.job';
import {
  GOOGLE_TRANSACTION_TTL_MS,
  MAGIC_LINK_TTL_MS,
  PENDING_GOOGLE_LINK_TTL_MS,
} from '../../../src/modules/authentication/application/policies/authentication-ttl.constants';
import { CHALLENGE_COOKIE_MAX_AGE_MS } from '../../../src/modules/authentication/interfaces/http/authentication-cookie.constants';
import { PendingGoogleLinkRateLimitPolicy } from '../../../src/modules/authentication/application/policies/pending-google-link.policy';
import {
  PENDING_GOOGLE_LINK_RATE_LIMIT,
  PENDING_GOOGLE_LINK_RATE_LIMIT_KEY_PREFIX,
  PENDING_GOOGLE_LINK_RATE_LIMIT_WINDOW_MS,
} from '../../../src/modules/authentication/application/policies/pending-google-link.constants';
import {
  InMemoryInboxStore,
  InMemoryOutboxStore,
} from '../../../src/modules/authentication/infrastructure/messaging/inbox/in-memory-messaging.store';

function pendingGoogleLink(
  id: string,
  userId: string,
  expiresAt: Date,
): PendingGoogleLink {
  return {
    id,
    version: 1,
    userId,
    subject: `google-${id}`,
    email: `${userId}@example.com`,
    expiresAt,
    status: 'ACTIVE',
    consumedAt: null,
    revokedAt: null,
  };
}

describe('user OCC', () => {
  it('rejects a stale user snapshot after a concurrent disable', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const testPasswordHash = 'hash'.repeat(4);
    const registered = UserAggregate.registerWithPassword(
      {
        id: 'user-1',
        passwordHash: testPasswordHash,
        termsVersion: '2026-08',
        acceptedAt: new Date('2026-08-27T12:00:00.000Z'),
        occurredAt: new Date('2026-08-27T12:00:00.000Z'),
      },
      NormalizedEmail.from('person@example.com'),
    );
    repository.createUser(registered.snapshot);

    const [disableSnapshot, staleLinkSnapshot] = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.findUserById('user-1'),
      ),
      repository.withTransaction((transaction) =>
        transaction.findUserById('user-1'),
      ),
    ]);
    if (disableSnapshot == null || staleLinkSnapshot == null) {
      throw new Error('test-user-not-created');
    }
    const disabled = UserAggregate.restore(disableSnapshot);
    disabled.disable();
    expect(
      await repository.withTransaction((transaction) =>
        transaction.updateUser(disabled.snapshot, disableSnapshot.status),
      ),
    ).toBe(true);

    const staleLink = UserAggregate.restore(staleLinkSnapshot);
    staleLink.attachGoogleIdentity(
      'google-subject',
      'person@example.com',
      new Date('2026-08-27T12:00:01.000Z'),
      'subject-fingerprint',
    );
    expect(
      await repository.withTransaction((transaction) =>
        transaction.updateUser(staleLink.snapshot, staleLinkSnapshot.status),
      ),
    ).toBe(false);
    expect(repository.findUserById('user-1')).toMatchObject({
      status: 'DISABLED',
      version: 2,
      externalIdentity: null,
    });
  });
});

describe('outbox leases', () => {
  it('prevents a stale outbox worker from publishing after lease recovery', () => {
    const store = new InMemoryOutboxStore();
    const issuedAt = new Date('2026-08-27T12:00:00.000Z');
    store.add({
      id: 'outbox-1',
      eventId: 'event-1',
      correlationId: 'correlation-1',
      event: {
        type: 'EmailVerified',
        userId: 'user-1',
        occurredAt: issuedAt,
      },
    });

    const [staleClaim] = store.claim({
      owner: 'worker-a',
      limit: 1,
      now: issuedAt,
      leaseMs: 1000,
    });
    const recoveredAt = new Date(issuedAt.getTime() + 1001);
    const [recoveredClaim] = store.claim({
      owner: 'worker-b',
      limit: 1,
      now: recoveredAt,
      leaseMs: 1000,
    });

    expect(
      store.markPublished({
        messageId: staleClaim.messageId,
        owner: staleClaim.leaseOwner,
        leaseVersion: staleClaim.leaseVersion,
        attempt: staleClaim.attempts,
        now: recoveredAt,
      }),
    ).toBe(false);
    expect(
      store.markPublished({
        messageId: recoveredClaim.messageId,
        owner: recoveredClaim.leaseOwner,
        leaseVersion: recoveredClaim.leaseVersion,
        attempt: recoveredClaim.attempts,
        now: new Date(recoveredAt.getTime() + 1),
      }),
    ).toBe(true);
  });
});

describe('inbox leases', () => {
  it('prevents a stale inbox worker from completing after lease recovery', () => {
    const store = new InMemoryInboxStore();
    const receivedAt = new Date('2026-08-27T12:00:00.000Z');
    const staleLease = store.acquire({
      consumerName: 'identity-consumer',
      eventId: 'event-1',
      messageId: 'message-1',
      receivedAt,
      owner: 'worker-a',
    });
    const recoveredAt = new Date(receivedAt.getTime() + 30_001);
    const recoveredLease = store.acquire({
      consumerName: 'identity-consumer',
      eventId: 'event-1',
      messageId: 'message-1',
      receivedAt: recoveredAt,
      owner: 'worker-b',
    });
    if (
      staleLease.outcome === 'DUPLICATE' ||
      recoveredLease.outcome === 'DUPLICATE' ||
      staleLease.lease === undefined ||
      recoveredLease.lease === undefined
    ) {
      throw new Error('test-lease-not-acquired');
    }

    expect(
      store.complete(staleLease.lease, new Date(recoveredAt.getTime() + 1)),
    ).toBe(false);
    expect(
      store.complete(recoveredLease.lease, new Date(recoveredAt.getTime() + 2)),
    ).toBe(true);
  });
});

describe('pending Google link lifecycle', () => {
  it('revokes the previous active attempt before saving a replacement', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const now = new Date('2026-08-27T12:00:00.000Z');
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink(
        pendingGoogleLink('link-1', 'user-1', new Date(now.getTime() + 10_000)),
        now,
      ),
    );
    await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.savePendingGoogleLink(
          pendingGoogleLink(
            'link-2',
            'user-1',
            new Date(now.getTime() + 20_000),
          ),
          now,
        ),
      ),
      repository.withTransaction((transaction) =>
        transaction.savePendingGoogleLink(
          pendingGoogleLink(
            'link-3',
            'user-1',
            new Date(now.getTime() + 30_000),
          ),
          now,
        ),
      ),
    ]);
    const first = await repository.withTransaction((transaction) =>
      transaction.findPendingGoogleLink('link-1'),
    );
    const second = await repository.withTransaction((transaction) =>
      transaction.findPendingGoogleLink('link-2'),
    );
    const third = await repository.withTransaction((transaction) =>
      transaction.findPendingGoogleLink('link-3'),
    );
    expect(first?.status).toBe('REVOKED');
    expect(second?.status).toBe('REVOKED');
    expect(third?.status).toBe('ACTIVE');
  });
});

describe('pending Google link cleanup', () => {
  it('marks expired links and purges only terminal records within the batch limit', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const expiresAt = new Date('2026-08-27T12:00:00.000Z');
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink(
        pendingGoogleLink('link-1', 'user-1', expiresAt),
        expiresAt,
      ),
    );

    expect(
      await repository.withTransaction((transaction) =>
        transaction.expirePendingGoogleLinks(
          new Date(expiresAt.getTime() + 1),
          10,
        ),
      ),
    ).toBe(1);
    expect(repository.findPendingGoogleLink('link-1')).toMatchObject({
      status: 'EXPIRED',
      version: 2,
    });
    expect(
      await repository.withTransaction((transaction) =>
        transaction.revokePendingGoogleLink(
          'link-1',
          new Date(expiresAt.getTime() + 2),
        ),
      ),
    ).toBe(false);

    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink(
        pendingGoogleLink('link-2', 'user-2', expiresAt),
        expiresAt,
      ),
    );
    const job = new CleanupPendingGoogleLinksJob(
      repository,
      { now: () => new Date(expiresAt.getTime() + 1) },
      1,
      0,
    );
    await expect(job.run()).resolves.toEqual({ expired: 1, deleted: 1 });
    expect(
      await repository.withTransaction((transaction) =>
        transaction.findPendingGoogleLink('link-2'),
      ),
    ).toMatchObject({ status: 'EXPIRED' });
  });
});

describe('pending Google link policies', () => {
  it('consumes a pending link once and rejects replay', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const now = new Date('2026-08-27T12:00:00.000Z');
    await repository.withTransaction((transaction) =>
      transaction.savePendingGoogleLink(
        pendingGoogleLink(
          'link-replay',
          'user-replay',
          new Date(now.getTime() + 60_000),
        ),
        now,
      ),
    );
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink('link-replay', now),
      ),
    ).resolves.toMatchObject({ status: 'CONSUMED', version: 2 });
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumePendingGoogleLink(
          'link-replay',
          new Date(now.getTime() + 1),
        ),
      ),
    ).resolves.toBeNull();
  });

  it('keeps the approved short-lived TTL relations in one source', () => {
    expect(PENDING_GOOGLE_LINK_TTL_MS).toBe(MAGIC_LINK_TTL_MS);
    expect(GOOGLE_TRANSACTION_TTL_MS).toBe(MAGIC_LINK_TTL_MS);
    expect(CHALLENGE_COOKIE_MAX_AGE_MS).toBe(MAGIC_LINK_TTL_MS);
  });

  it('applies creation rate control to the stable user key', async () => {
    const calls: Array<{
      readonly key: string;
      readonly limit: number;
      readonly windowMs: number;
    }> = [];
    const rateLimit = {
      check: (key: string, limit: number, windowMs: number): boolean => {
        calls.push({ key, limit, windowMs });
        return true;
      },
      record: (): void => undefined,
    };
    await new PendingGoogleLinkRateLimitPolicy(rateLimit).check('user-1');
    expect(calls).toEqual([
      {
        key: `${PENDING_GOOGLE_LINK_RATE_LIMIT_KEY_PREFIX}user-1`,
        limit: PENDING_GOOGLE_LINK_RATE_LIMIT,
        windowMs: PENDING_GOOGLE_LINK_RATE_LIMIT_WINDOW_MS,
      },
    ]);
  });
});
