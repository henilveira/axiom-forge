export type UserStatus = 'EMAIL_VERIFICATION_PENDING' | 'ACTIVE' | 'DISABLED';

export type AuthenticationMethod = 'PASSWORD' | 'GOOGLE' | 'MAGIC_LINK';

export type ChallengePurpose =
  'EMAIL_VERIFICATION' | 'MAGIC_LOGIN' | 'GOOGLE_OAUTH' | 'GOOGLE_LINK';

export type ChallengeStatus = 'ISSUED' | 'USED' | 'EXPIRED' | 'REVOKED';

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type PendingGoogleLinkStatus =
  'ACTIVE' | 'CONSUMED' | 'REVOKED' | 'EXPIRED';

export type FailureCategory =
  | 'INVALID_CREDENTIAL'
  | 'ACCOUNT_INACTIVE'
  | 'CHALLENGE_INVALID'
  | 'OAUTH_INVALID'
  | 'RATE_LIMITED'
  | 'CSRF_INVALID'
  | 'PROVIDER_UNAVAILABLE';

export interface UserSnapshot {
  readonly id: string;
  readonly version: number;
  readonly emailNormalized: string;
  readonly status: UserStatus;
  readonly emailVerifiedAt: Date | null;
  readonly termsVersion: string | null;
  readonly termsAcceptedAt: Date | null;
  readonly localCredentialHash: string | null;
  readonly externalIdentity: ExternalIdentitySnapshot | null;
}

export interface ExternalIdentitySnapshot {
  readonly provider: 'google';
  readonly subject: string;
  readonly email: string;
}

export interface SessionSnapshot {
  readonly id: string;
  readonly familyId: string;
  readonly userId: string;
  readonly authMethod: AuthenticationMethod;
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
  readonly refreshExpiresAt: Date;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly lastRefreshedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AuthenticationContext {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly browserBinding?: string;
}

export interface PublicAuthenticationResult {
  readonly outcome: 'SUCCESS' | 'ACCEPTED' | 'REJECTED' | 'LINK_REQUIRED';
  readonly userId?: string;
  readonly session?: SessionSnapshot;
  readonly redirectUrl?: string;
  readonly linkAttemptId?: string;
}
