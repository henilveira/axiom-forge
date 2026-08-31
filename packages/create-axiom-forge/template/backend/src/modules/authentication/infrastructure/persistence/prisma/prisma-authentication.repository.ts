import type {
  Prisma,
  PrismaClient,
} from '../../../../../generated/prisma/client';
import { AuthenticationError } from '../../../domain/errors/authentication.error';
import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type { AuthenticationLoggerPort } from '../../../application/ports/logger.port';
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
  UserStatus,
  UserSnapshot,
  SessionSnapshot,
} from '../../../domain/types/authentication.types';
import { PRISMA_PROVIDER_SUBJECT_KEY } from './prisma.constants';
import { isUniqueConstraintError } from './prisma-error.mapper';
import { PrismaPendingGoogleLinkStore } from './prisma-pending-google-link.store';
import { PrismaOutboxAppender } from './prisma-outbox-appender';
import { toChallenge, toUser } from './prisma-authentication.mapper';
import { PrismaSessionStore } from './prisma-session.store';

export class PrismaAuthenticationRepository implements AuthenticationRepositoryPort {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: AuthenticationLoggerPort,
  ) {}

  public async withTransaction<T>(
    work: (
      repository: TransactionalAuthenticationRepository,
    ) => RepositoryResult<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(
      async (transaction) =>
        await work(
          new PrismaAuthenticationTransaction(transaction, this.logger),
        ),
    );
  }
}

class PrismaAuthenticationTransaction implements TransactionalAuthenticationRepository {
  private readonly pendingGoogleLinks: PrismaPendingGoogleLinkStore;
  private readonly outboxAppender: PrismaOutboxAppender;
  private readonly sessions: PrismaSessionStore;

  public constructor(
    private readonly client: Prisma.TransactionClient,
    logger: AuthenticationLoggerPort,
  ) {
    this.pendingGoogleLinks = new PrismaPendingGoogleLinkStore(client);
    this.outboxAppender = new PrismaOutboxAppender(client, logger);
    this.sessions = new PrismaSessionStore(client);
  }

  public async findUserByEmail(
    emailNormalized: string,
  ): Promise<UserSnapshot | null> {
    const user = await this.client.user.findUnique({
      where: { emailNormalized },
      include: { localCredential: true, externalIdentity: true },
    });
    return user == null ? null : toUser(user);
  }

  public async findUserById(userId: string): Promise<UserSnapshot | null> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      include: { localCredential: true, externalIdentity: true },
    });
    return user == null ? null : toUser(user);
  }

  public async findUserByExternalIdentity(
    provider: 'google',
    subject: string,
  ): Promise<UserSnapshot | null> {
    const identity = await this.client.externalIdentity.findUnique({
      where: { [PRISMA_PROVIDER_SUBJECT_KEY]: { provider, subject } },
      include: {
        user: { include: { localCredential: true, externalIdentity: true } },
      },
    });
    return identity == null ? null : toUser(identity.user);
  }

  public async createUser(user: UserSnapshot): Promise<void> {
    try {
      await this.client.user.create({
        data: {
          id: user.id,
          version: user.version,
          emailNormalized: user.emailNormalized,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          termsVersion: user.termsVersion,
          termsAcceptedAt: user.termsAcceptedAt,
        },
      });
      if (user.localCredentialHash != null) {
        await this.client.localCredential.create({
          data: { userId: user.id, passwordHash: user.localCredentialHash },
        });
      }
      if (user.externalIdentity != null) {
        await this.client.externalIdentity.create({
          data: {
            userId: user.id,
            provider: user.externalIdentity.provider,
            subject: user.externalIdentity.subject,
            email: user.externalIdentity.email,
          },
        });
      }
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new AuthenticationError(
          'EMAIL_ALREADY_EXISTS',
          'INVALID_CREDENTIAL',
        );
      }
      throw error;
    }
  }

  public async updateUser(
    user: UserSnapshot,
    expectedStatus: UserStatus,
  ): Promise<boolean> {
    const updated = await this.client.user.updateMany({
      where: { id: user.id, version: user.version, status: expectedStatus },
      data: {
        emailNormalized: user.emailNormalized,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        termsVersion: user.termsVersion,
        termsAcceptedAt: user.termsAcceptedAt,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      return false;
    }
    if (user.localCredentialHash == null) {
      await this.client.localCredential.deleteMany({
        where: { userId: user.id },
      });
    } else {
      await this.client.localCredential.upsert({
        where: { userId: user.id },
        create: { userId: user.id, passwordHash: user.localCredentialHash },
        update: { passwordHash: user.localCredentialHash },
      });
    }
    if (user.externalIdentity == null) {
      await this.client.externalIdentity.deleteMany({
        where: { userId: user.id },
      });
    } else {
      await this.client.externalIdentity.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          provider: user.externalIdentity.provider,
          subject: user.externalIdentity.subject,
          email: user.externalIdentity.email,
        },
        update: {
          provider: user.externalIdentity.provider,
          subject: user.externalIdentity.subject,
          email: user.externalIdentity.email,
        },
      });
    }
    return true;
  }

  public async saveChallenge(challenge: StoredChallenge): Promise<void> {
    await this.client.authenticationChallenge.create({
      data: {
        id: challenge.id,
        purpose: challenge.purpose,
        digest: challenge.digest,
        userId: challenge.userId,
        createdAt: challenge.createdAt,
        expiresAt: challenge.expiresAt,
        status: challenge.status,
        consumedAt: challenge.consumedAt,
        stateDigest: challenge.stateDigest,
        nonceDigest: challenge.nonceDigest,
      },
    });
  }

  public async consumeChallenge(
    digest: string,
    purpose: ChallengePurpose,
    now: Date,
    userId?: string,
  ): Promise<StoredChallenge | null> {
    const updated = await this.client.authenticationChallenge.updateMany({
      where: {
        digest,
        purpose,
        status: 'ISSUED',
        expiresAt: { gt: now },
        ...(userId === undefined ? {} : { userId }),
      },
      data: { status: 'USED', consumedAt: now },
    });
    if (updated.count !== 1) {
      return null;
    }
    const challenge = await this.client.authenticationChallenge.findUnique({
      where: { digest },
    });
    return challenge == null ? null : toChallenge(challenge);
  }

  public async revokeChallenge(
    challengeId: string,
    expectedStatus: ChallengeStatus,
  ): Promise<boolean> {
    if (expectedStatus !== 'ISSUED') {
      return false;
    }
    const updated = await this.client.authenticationChallenge.updateMany({
      where: { id: challengeId, status: expectedStatus },
      data: { status: 'REVOKED' },
    });
    return updated.count === 1;
  }

  public async createSession(session: SessionSnapshot): Promise<void> {
    await this.sessions.createSession(session);
  }

  public async createSessionForActiveUser(
    session: SessionSnapshot,
  ): Promise<boolean> {
    return await this.sessions.createSessionForActiveUser(session);
  }

  public async findSessionByRefreshHash(
    refreshTokenHash: string,
  ): Promise<SessionSnapshot | null> {
    return await this.sessions.findSessionByRefreshHash(refreshTokenHash);
  }

  public async findSessionById(
    sessionId: string,
  ): Promise<SessionSnapshot | null> {
    return await this.sessions.findSessionById(sessionId);
  }

  public async rotateSession(
    sessionId: string,
    previousRefreshHash: string,
    nextSession: SessionSnapshot,
    now: Date,
  ): Promise<'ROTATED' | 'REPLAY' | 'INVALID'> {
    return await this.sessions.rotateSession(
      sessionId,
      previousRefreshHash,
      nextSession,
      now,
    );
  }

  public async revokeSession(sessionId: string, now: Date): Promise<void> {
    await this.sessions.revokeSession(sessionId, now);
  }

  public async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.sessions.revokeFamily(familyId, now);
  }

  public async savePendingGoogleLink(
    link: PendingGoogleLink,
    now: Date,
  ): Promise<void> {
    await this.pendingGoogleLinks.save(link, now);
  }

  public findPendingGoogleLink(id: string): Promise<PendingGoogleLink | null> {
    return this.pendingGoogleLinks.find(id);
  }

  public async consumePendingGoogleLink(
    id: string,
    now: Date,
  ): Promise<PendingGoogleLink | null> {
    return await this.pendingGoogleLinks.consume(id, now);
  }

  public async revokePendingGoogleLink(
    id: string,
    now: Date,
  ): Promise<boolean> {
    return await this.pendingGoogleLinks.revoke(id, now);
  }

  public async expirePendingGoogleLinks(
    now: Date,
    limit: number,
  ): Promise<number> {
    return await this.pendingGoogleLinks.expire(now, limit);
  }

  public async cleanupPendingGoogleLinks(
    now: Date,
    retentionMs: number,
    limit: number,
  ): Promise<PendingGoogleLinkCleanupResult> {
    return await this.pendingGoogleLinks.cleanup(now, retentionMs, limit);
  }

  public appendOutbox = (
    event: AuthenticationDomainEvent,
    correlationId: string,
  ): Promise<void> => this.outboxAppender.append(event, correlationId);
}
