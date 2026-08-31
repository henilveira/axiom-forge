import type { AuthenticationContext } from '../../domain/types/authentication.types';

export interface RegisterWithPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly termsVersion: string;
  readonly context: AuthenticationContext;
}

export interface AuthenticateWithPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly fingerprint: string;
  readonly context: AuthenticationContext;
}

export interface RequestMagicLinkInput {
  readonly email: string;
  readonly fingerprint: string;
  readonly context: AuthenticationContext;
}

export interface ConsumeMagicLinkInput {
  readonly token: string;
  readonly context: AuthenticationContext;
}

export interface VerifyEmailInput {
  readonly token: string;
  readonly context: AuthenticationContext;
}

export interface RefreshSessionInput {
  readonly refreshToken: string;
  readonly context: AuthenticationContext;
}
