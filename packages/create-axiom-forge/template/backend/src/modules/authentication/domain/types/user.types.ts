import type { UserStatus } from './authentication.types';

export interface UserAggregateProps {
  readonly id: string;
  readonly version: number;
  readonly emailNormalized: string;
  readonly status: UserStatus;
  readonly emailVerifiedAt: Date | null;
  readonly termsVersion: string | null;
  readonly termsAcceptedAt: Date | null;
  readonly localCredentialHash: string | null;
  readonly externalIdentity: {
    readonly provider: 'google';
    readonly subject: string;
    readonly email: string;
  } | null;
}

export interface PasswordUserRegistrationProps {
  readonly id: string;
  readonly passwordHash: string;
  readonly termsVersion: string;
  readonly acceptedAt: Date;
  readonly occurredAt: Date;
}
