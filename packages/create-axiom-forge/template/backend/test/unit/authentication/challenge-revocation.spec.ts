import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';

describe('authentication challenge delivery-failure revocation', () => {
  it('revokes an issued challenge once and rejects stale status updates', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const challengeId = '00000000-0000-4000-8000-000000000401';
    const digest = 'd'.repeat(64);
    await repository.withTransaction((transaction) =>
      transaction.saveChallenge({
        id: challengeId,
        purpose: 'MAGIC_LOGIN',
        digest,
        userId: '00000000-0000-4000-8000-000000000402',
        createdAt: new Date('2026-08-27T12:00:00.000Z'),
        expiresAt: new Date('2026-08-27T12:10:00.000Z'),
        status: 'ISSUED',
        consumedAt: null,
        stateDigest: null,
        nonceDigest: null,
      }),
    );

    const results = await Promise.all([
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
    ]);

    expect(results.filter((result) => result)).toHaveLength(1);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'ISSUED'),
      ),
    ).resolves.toBe(false);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(challengeId, 'USED'),
      ),
    ).resolves.toBe(false);
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(
          digest,
          'MAGIC_LOGIN',
          new Date('2026-08-27T12:00:01.000Z'),
        ),
      ),
    ).resolves.toBeNull();
  });
});
