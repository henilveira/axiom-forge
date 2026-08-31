import type { FailureCategory } from '../types/authentication.types';

export type AuthenticationErrorCode =
  | 'INVALID_INPUT'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_CREDENTIAL'
  | 'ACCOUNT_INACTIVE'
  | 'CHALLENGE_INVALID'
  | 'OAUTH_INVALID'
  | 'ACCOUNT_LINKING_REQUIRED'
  | 'SESSION_INVALID'
  | 'SESSION_REPLAY'
  | 'CSRF_INVALID'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE';

export class AuthenticationError extends Error {
  public constructor(
    public readonly code: AuthenticationErrorCode,
    public readonly category: FailureCategory,
    message = code,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
