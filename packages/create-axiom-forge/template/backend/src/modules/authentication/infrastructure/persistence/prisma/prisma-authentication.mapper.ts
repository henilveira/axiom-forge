import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type {
  SessionSnapshot,
  UserSnapshot,
} from '../../../domain/types/authentication.types';
import type { StoredChallenge } from '../../../application/ports/authentication-repository.port';
import type { PendingGoogleLink } from '../../../application/ports/authentication-repository.port';
import type {
  PrismaChallengeRecord,
  PrismaPendingGoogleLinkRecord,
  PrismaSessionRecord,
  PrismaUserRecord,
} from './prisma.types';

export function toUser(user: PrismaUserRecord): UserSnapshot {
  return {
    id: user.id,
    version: user.version,
    emailNormalized: user.emailNormalized,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    termsVersion: user.termsVersion,
    termsAcceptedAt: user.termsAcceptedAt,
    localCredentialHash: user.localCredential?.passwordHash ?? null,
    externalIdentity:
      user.externalIdentity == null
        ? null
        : {
            provider: 'google',
            subject: user.externalIdentity.subject,
            email: user.externalIdentity.email,
          },
  };
}

export function toChallenge(challenge: PrismaChallengeRecord): StoredChallenge {
  return { ...challenge };
}

export function toPendingGoogleLink(
  link: PrismaPendingGoogleLinkRecord,
): PendingGoogleLink {
  return {
    id: link.id,
    version: link.version,
    userId: link.userId,
    subject: link.subject,
    email: link.email,
    expiresAt: link.expiresAt,
    status: link.status,
    consumedAt: link.consumedAt,
    revokedAt: link.revokedAt,
  };
}

export function toSession(session: PrismaSessionRecord): SessionSnapshot {
  return { ...session };
}

export function aggregateIdFor(
  event: AuthenticationDomainEvent,
): string | null {
  if ('userId' in event) {
    return event.userId;
  }
  if ('familyId' in event) {
    return event.familyId;
  }
  return null;
}
