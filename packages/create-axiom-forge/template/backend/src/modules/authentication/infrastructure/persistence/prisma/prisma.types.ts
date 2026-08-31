import type {
  ChallengePurpose,
  PendingGoogleLinkStatus,
  SessionSnapshot,
  UserSnapshot,
} from '../../../domain/types/authentication.types';
import type { StoredChallenge } from '../../../application/ports/authentication-repository.port';

export interface PrismaUserRecord {
  readonly id: string;
  readonly version: number;
  readonly emailNormalized: string;
  readonly status: UserSnapshot['status'];
  readonly emailVerifiedAt: Date | null;
  readonly termsVersion: string | null;
  readonly termsAcceptedAt: Date | null;
  readonly localCredential: { readonly passwordHash: string } | null;
  readonly externalIdentity: {
    readonly provider: string;
    readonly subject: string;
    readonly email: string;
  } | null;
}

export interface PrismaChallengeRecord {
  readonly id: string;
  readonly purpose: ChallengePurpose;
  readonly digest: string;
  readonly userId: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly status: StoredChallenge['status'];
  readonly consumedAt: Date | null;
  readonly stateDigest: string | null;
  readonly nonceDigest: string | null;
}

export interface PrismaPendingGoogleLinkRecord {
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

export interface PrismaSessionRecord {
  readonly id: string;
  readonly familyId: string;
  readonly userId: string;
  readonly authMethod: SessionSnapshot['authMethod'];
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
  readonly refreshExpiresAt: Date;
  readonly status: SessionSnapshot['status'];
  readonly createdAt: Date;
  readonly lastRefreshedAt: Date | null;
  readonly revokedAt: Date | null;
}
