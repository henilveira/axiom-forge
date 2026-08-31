import type { ChallengePurpose, ChallengeStatus } from './authentication.types';

export interface AuthenticationChallengeProps {
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
