import { AuthenticationError } from '../../../domain/errors/authentication.error';
import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type {
  AuthenticationRepositoryPort,
  PendingGoogleLink,
  PendingGoogleLinkCleanupResult,
  RepositoryResult,
  StoredChallenge,
  TransactionalAuthenticationRepository,
} from '../../../application/ports/authentication-repository.port';
import type {
  ChallengePurpose,
  ChallengeStatus,
  SessionSnapshot,
  UserStatus,
  UserSnapshot,
} from '../../../domain/types/authentication.types';
import { boundedPendingGoogleLinkCleanupLimit } from '../pending-google-link.cleanup';
import { cloneSession } from './in-memory-session.mapper';

export class InMemoryAuthenticationRepository implements AuthenticationRepositoryPort {
  private readonly users = new Map<string, UserSnapshot>();
  private readonly challenges = new Map<string, StoredChallenge>();
  private readonly sessions = new Map<string, SessionSnapshot>();
  private readonly links = new Map<string, PendingGoogleLink>();
  private readonly outbox: Array<{
    event: AuthenticationDomainEvent;
    correlationId: string;
  }> = [];

  public async withTransaction<T>(
    work: (
      repository: TransactionalAuthenticationRepository,
    ) => RepositoryResult<T>,
  ): Promise<T> {
    return await work(this);
  }

  public findUserByEmail(emailNormalized: string): UserSnapshot | null {
    for (const user of this.users.values()) {
      if (user.emailNormalized === emailNormalized) {
        return this.cloneUser(user);
      }
    }
    return null;
  }

  public findUserByExternalIdentity(
    provider: 'google',
    subject: string,
  ): UserSnapshot | null {
    for (const user of this.users.values()) {
      if (
        user.externalIdentity?.provider === provider &&
        user.externalIdentity.subject === subject
      ) {
        return this.cloneUser(user);
      }
    }
    return null;
  }

  public findUserById(userId: string): UserSnapshot | null {
    const user = this.users.get(userId);
    return user !== undefined ? this.cloneUser(user) : null;
  }

  public createUser(user: UserSnapshot): void {
    const existingUser = this.findUserByEmail(user.emailNormalized);
    if (existingUser != null) {
      throw new AuthenticationError(
        'EMAIL_ALREADY_EXISTS',
        'INVALID_CREDENTIAL',
      );
    }
    this.users.set(user.id, this.cloneUser(user));
  }

  public updateUser(user: UserSnapshot, expectedStatus: UserStatus): boolean {
    const current = this.users.get(user.id);
    if (
      current?.version !== user.version ||
      current.status !== expectedStatus
    ) {
      return false;
    }
    this.users.set(
      user.id,
      this.cloneUser({ ...user, version: user.version + 1 }),
    );
    return true;
  }

  public saveChallenge(challenge: StoredChallenge): void {
    this.challenges.set(challenge.id, this.cloneChallenge(challenge));
  }

  public consumeChallenge(
    digest: string,
    purpose: ChallengePurpose,
    now: Date,
    userId?: string,
  ): StoredChallenge | null {
    for (const challenge of this.challenges.values()) {
      if (
        challenge.digest !== digest ||
        challenge.purpose !== purpose ||
        (userId !== undefined && challenge.userId !== userId)
      ) {
        continue;
      }
      if (
        challenge.status !== 'ISSUED' ||
        challenge.expiresAt.getTime() <= now.getTime()
      ) {
        if (challenge.status === 'ISSUED') {
          this.challenges.set(challenge.id, {
            ...challenge,
            status: 'EXPIRED',
          });
        }
        return null;
      }
      const consumed = {
        ...challenge,
        status: 'USED' as const,
        consumedAt: now,
      };
      this.challenges.set(challenge.id, consumed);
      return this.cloneChallenge(consumed);
    }
    return null;
  }

  public revokeChallenge(
    challengeId: string,
    expectedStatus: ChallengeStatus,
  ): boolean {
    const challenge = this.challenges.get(challengeId);
    if (expectedStatus !== 'ISSUED' || challenge?.status !== expectedStatus) {
      return false;
    }
    this.challenges.set(challengeId, { ...challenge, status: 'REVOKED' });
    return true;
  }

  public createSession(session: SessionSnapshot): void {
    this.sessions.set(session.id, cloneSession(session));
  }

  public createSessionForActiveUser(session: SessionSnapshot): boolean {
    const user = this.users.get(session.userId);
    if (user?.status !== 'ACTIVE' || user.emailVerifiedAt == null) {
      return false;
    }
    this.createSession(session);
    return true;
  }

  public findSessionByRefreshHash(
    refreshTokenHash: string,
  ): SessionSnapshot | null {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === refreshTokenHash) {
        return cloneSession(session);
      }
    }
    return null;
  }

  public findSessionById(sessionId: string): SessionSnapshot | null {
    const session = this.sessions.get(sessionId);
    return session !== undefined ? cloneSession(session) : null;
  }

  public rotateSession(
    sessionId: string,
    previousRefreshHash: string,
    nextSession: SessionSnapshot,
    now: Date,
  ): 'ROTATED' | 'REPLAY' | 'INVALID' {
    const user = this.users.get(nextSession.userId);
    const current = this.sessions.get(sessionId);
    if (user?.status !== 'ACTIVE' || user.emailVerifiedAt == null) {
      return 'INVALID';
    }
    if (current?.refreshTokenHash !== previousRefreshHash) {
      return 'INVALID';
    }
    if (
      current.status !== 'ACTIVE' ||
      current.refreshExpiresAt.getTime() <= now.getTime()
    ) {
      this.revokeFamily(current.familyId, now);
      return 'REPLAY';
    }
    this.sessions.set(sessionId, {
      ...current,
      status: 'REVOKED',
      revokedAt: now,
    });
    this.sessions.set(nextSession.id, cloneSession(nextSession));
    return 'ROTATED';
  }

  public revokeSession(sessionId: string, now: Date): void {
    const session = this.sessions.get(sessionId);
    if (session !== undefined) {
      this.sessions.set(sessionId, {
        ...session,
        status: 'REVOKED',
        revokedAt: now,
      });
    }
  }

  public revokeFamily(familyId: string, now: Date): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.familyId === familyId && session.status === 'ACTIVE') {
        this.sessions.set(id, {
          ...session,
          status: 'REVOKED',
          revokedAt: now,
        });
      }
    }
  }

  public savePendingGoogleLink(link: PendingGoogleLink, now: Date): void {
    for (const [id, current] of this.links.entries()) {
      if (current.userId === link.userId && current.status === 'ACTIVE') {
        this.links.set(id, {
          ...current,
          status: 'REVOKED',
          revokedAt: now,
          version: current.version + 1,
        });
      }
    }
    this.links.set(link.id, { ...link });
  }

  public findPendingGoogleLink(id: string): PendingGoogleLink | null {
    const link = this.links.get(id);
    return link !== undefined ? { ...link } : null;
  }

  public consumePendingGoogleLink(
    id: string,
    now: Date,
  ): PendingGoogleLink | null {
    const link = this.links.get(id);
    if (
      link?.status !== 'ACTIVE' ||
      link.consumedAt != null ||
      link.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    const consumed = {
      ...link,
      status: 'CONSUMED' as const,
      consumedAt: now,
      version: link.version + 1,
    };
    this.links.set(id, consumed);
    return { ...consumed };
  }

  public revokePendingGoogleLink(id: string, now: Date): boolean {
    const link = this.links.get(id);
    if (link?.status !== 'ACTIVE' || link.consumedAt != null) {
      return false;
    }
    this.links.set(id, {
      ...link,
      status: 'REVOKED',
      revokedAt: now,
      version: link.version + 1,
    });
    return true;
  }

  public expirePendingGoogleLinks(now: Date, limit: number): number {
    let expired = 0;
    for (const [id, link] of this.links.entries()) {
      if (
        expired >= limit ||
        link.status !== 'ACTIVE' ||
        link.consumedAt != null ||
        link.expiresAt.getTime() > now.getTime()
      ) {
        continue;
      }
      this.links.set(id, {
        ...link,
        status: 'EXPIRED',
        version: link.version + 1,
      });
      expired += 1;
    }
    return expired;
  }

  public cleanupPendingGoogleLinks(
    now: Date,
    retentionMs: number,
    limit: number,
  ): PendingGoogleLinkCleanupResult {
    const boundedLimit = boundedPendingGoogleLinkCleanupLimit(limit);
    const expired = this.expirePendingGoogleLinks(now, boundedLimit);
    if (boundedLimit === 0 || retentionMs < 0) {
      return { expired, deleted: 0 };
    }
    const cutoff = now.getTime() - retentionMs;
    let deleted = 0;
    for (const [id, link] of this.links.entries()) {
      if (deleted >= boundedLimit || link.status === 'ACTIVE') {
        continue;
      }
      const terminalAt = link.consumedAt ?? link.revokedAt ?? link.expiresAt;
      if (terminalAt.getTime() <= cutoff) {
        this.links.delete(id);
        deleted += 1;
      }
    }
    return { expired, deleted };
  }

  public appendOutbox(
    event: AuthenticationDomainEvent,
    correlationId: string,
  ): void {
    this.outbox.push({ event, correlationId });
  }

  public getOutbox(): ReadonlyArray<{
    event: AuthenticationDomainEvent;
    correlationId: string;
  }> {
    return this.outbox.map((item) => ({
      event: item.event,
      correlationId: item.correlationId,
    }));
  }

  private cloneUser(user: UserSnapshot): UserSnapshot {
    return {
      ...user,
      emailVerifiedAt:
        user.emailVerifiedAt != null
          ? new Date(user.emailVerifiedAt.getTime())
          : null,
      termsAcceptedAt:
        user.termsAcceptedAt != null
          ? new Date(user.termsAcceptedAt.getTime())
          : null,
      externalIdentity:
        user.externalIdentity != null ? { ...user.externalIdentity } : null,
    };
  }

  private cloneChallenge(challenge: StoredChallenge): StoredChallenge {
    return {
      ...challenge,
      createdAt: new Date(challenge.createdAt.getTime()),
      expiresAt: new Date(challenge.expiresAt.getTime()),
      consumedAt:
        challenge.consumedAt != null
          ? new Date(challenge.consumedAt.getTime())
          : null,
    };
  }
}
