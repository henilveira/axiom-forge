import type { AuthenticationDomainEvent } from '../../domain/events/authentication.event';
import type {
  AuthenticationMethod,
  ChallengePurpose,
  ChallengeStatus,
  PendingGoogleLinkStatus,
  SessionSnapshot,
  UserStatus,
  UserSnapshot,
} from '../../domain/types/authentication.types';

export type RepositoryResult<T> = T | Promise<T>;

export interface StoredChallenge {
  readonly id: string;
  readonly purpose: ChallengePurpose;
  readonly digest: string;
  readonly userId: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly status: ChallengeStatus;
  readonly consumedAt: Date | null;
  readonly stateDigest: string | null;
  readonly nonceDigest: string | null;
}

export interface PendingGoogleLink {
  readonly id: string;
  readonly version: number;
  readonly userId: string;
  readonly subject: string;
  readonly email: string;
  readonly expiresAt: Date;
  readonly status: PendingGoogleLinkStatus;
  readonly consumedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface PendingGoogleLinkCleanupResult {
  readonly expired: number;
  readonly deleted: number;
}

export interface TransactionalAuthenticationRepository {
  findUserByEmail(
    emailNormalized: string,
  ): RepositoryResult<UserSnapshot | null>;
  findUserById(userId: string): RepositoryResult<UserSnapshot | null>;
  findUserByExternalIdentity(
    provider: 'google',
    subject: string,
  ): RepositoryResult<UserSnapshot | null>;
  createUser(user: UserSnapshot): RepositoryResult<void>;
  /** Updates only the snapshot version observed with the expected current state. */
  updateUser(
    user: UserSnapshot,
    expectedStatus: UserStatus,
  ): RepositoryResult<boolean>;
  saveChallenge(challenge: StoredChallenge): RepositoryResult<void>;
  consumeChallenge(
    digest: string,
    purpose: ChallengePurpose,
    now: Date,
    userId?: string,
  ): RepositoryResult<StoredChallenge | null>;
  /**
   * Revokes a challenge only when it is still in the expected state.
   *
   * The compare-and-set result is false for a missing challenge, a stale
   * status, or an expected status that cannot transition to REVOKED.
   */
  revokeChallenge(
    challengeId: string,
    expectedStatus: ChallengeStatus,
  ): RepositoryResult<boolean>;
  createSession(session: SessionSnapshot): RepositoryResult<void>;
  /** Revalidates the user while holding the transaction row lock. */
  createSessionForActiveUser(
    session: SessionSnapshot,
  ): RepositoryResult<boolean>;
  findSessionByRefreshHash(
    refreshTokenHash: string,
  ): RepositoryResult<SessionSnapshot | null>;
  findSessionById(sessionId: string): RepositoryResult<SessionSnapshot | null>;
  rotateSession(
    sessionId: string,
    previousRefreshHash: string,
    nextSession: SessionSnapshot,
    now: Date,
  ): RepositoryResult<'ROTATED' | 'REPLAY' | 'INVALID'>;
  revokeSession(sessionId: string, now: Date): RepositoryResult<void>;
  revokeFamily(familyId: string, now: Date): RepositoryResult<void>;
  savePendingGoogleLink(
    link: PendingGoogleLink,
    now: Date,
  ): RepositoryResult<void>;
  findPendingGoogleLink(id: string): RepositoryResult<PendingGoogleLink | null>;
  consumePendingGoogleLink(
    id: string,
    now: Date,
  ): RepositoryResult<PendingGoogleLink | null>;
  revokePendingGoogleLink(id: string, now: Date): RepositoryResult<boolean>;
  expirePendingGoogleLinks(now: Date, limit: number): RepositoryResult<number>;
  cleanupPendingGoogleLinks(
    now: Date,
    retentionMs: number,
    limit: number,
  ): RepositoryResult<PendingGoogleLinkCleanupResult>;
  appendOutbox(
    event: AuthenticationDomainEvent,
    correlationId: string,
  ): RepositoryResult<void>;
}

export interface AuthenticationRepositoryPort {
  withTransaction<T>(
    work: (
      repository: TransactionalAuthenticationRepository,
    ) => RepositoryResult<T>,
  ): Promise<T>;
}

export interface SessionCreationInput {
  readonly userId: string;
  readonly authMethod: AuthenticationMethod;
  readonly id: string;
  readonly familyId: string;
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
  readonly createdAt: Date;
  readonly refreshExpiresAt: Date;
}
