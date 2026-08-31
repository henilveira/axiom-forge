import type { AuthenticationContext } from '../../domain/types/authentication.types';
import type { SessionResult } from './authentication-result.dto';

export interface GoogleCallbackInput {
  readonly code: string;
  readonly state: string;
  readonly context: AuthenticationContext;
}

export interface ConfirmGoogleLinkInput {
  readonly attemptId: string;
  readonly password?: string;
  readonly magicToken?: string;
  readonly context: AuthenticationContext;
}

export interface GoogleAuthorizationResult {
  readonly outcome: 'REDIRECT';
  readonly authorizationUrl: string;
  readonly state: string;
}

export interface GoogleCallbackLinkRequired {
  readonly outcome: 'LINK_REQUIRED';
  readonly linkAttemptId: string;
}

export type GoogleCallbackResult = SessionResult | GoogleCallbackLinkRequired;
