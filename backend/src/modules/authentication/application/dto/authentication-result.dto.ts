import type {
  AuthenticationMethod,
  PublicAuthenticationResult,
  SessionSnapshot,
} from '../../domain/types/authentication.types';

export interface ChallengeResult {
  readonly outcome: 'ACCEPTED' | 'REJECTED';
  readonly expiresAt?: Date;
}

export interface SessionResult {
  readonly outcome: 'SUCCESS';
  readonly session: SessionSnapshot;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly authMethod: AuthenticationMethod;
}

export type AuthenticationResult = PublicAuthenticationResult;
