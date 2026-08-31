import { AuthenticationChallengeAggregate } from '../../../src/modules/authentication/domain/aggregates/authentication-challenge.aggregate';
import { SessionFamilyAggregate } from '../../../src/modules/authentication/domain/aggregates/session-family.aggregate';
import type { SessionSnapshot } from '../../../src/modules/authentication/domain/types/authentication.types';
import {
  FixedAuthenticationClock,
  FixedAuthenticationRandom,
} from '../../test-kit/authentication-fakes';

describe('authentication domain aggregates', () => {
  it('enforces one-time challenge consumption and expiry', () => {
    const clock = new FixedAuthenticationClock();
    const random = new FixedAuthenticationRandom();
    const challenge = AuthenticationChallengeAggregate.issue({
      id: random.id(),
      purpose: 'MAGIC_LOGIN',
      digest: 'digest',
      userId: 'user-1',
      createdAt: clock.now(),
      expiresAt: clock.at(60_000),
      status: 'ISSUED',
      consumedAt: null,
      stateDigest: null,
      nonceDigest: null,
    });

    challenge.consume(clock.now());

    expect(challenge.snapshot.status).toBe('USED');
    expect(challenge.snapshot.consumedAt).toEqual(clock.now());
    expect(random.bytes(3)).toHaveLength(3);
    expect(() => challenge.consume(clock.now())).toThrow('CHALLENGE_INVALID');
  });

  it('rejects rotation after the session family is revoked', () => {
    const now = new FixedAuthenticationClock().now();
    const session: SessionSnapshot = {
      id: 'session-1',
      familyId: 'family-1',
      userId: 'user-1',
      authMethod: 'PASSWORD',
      accessTokenHash: 'access-hash',
      refreshTokenHash: 'refresh-hash',
      refreshExpiresAt: new Date(now.getTime() + 60_000),
      status: 'ACTIVE',
      createdAt: now,
      lastRefreshedAt: null,
      revokedAt: null,
    };
    const family = SessionFamilyAggregate.restore(session.familyId);

    family.assertCanRotate(session, now);
    family.revoke(now);

    expect(() => family.assertCanRotate(session, now)).toThrow(
      'SESSION_INVALID',
    );
  });
});
