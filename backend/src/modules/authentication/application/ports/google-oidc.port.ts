import type { AuthenticationContext } from '../../domain/types/authentication.types';

export interface GoogleAuthorizationRequest {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly expiresAt: Date;
  readonly browserBinding: string;
  readonly correlationId: string;
}

export interface GoogleClaims {
  readonly subject: string;
  readonly email: string;
  readonly name: string | null;
  readonly picture: string | null;
  readonly issuer: string;
  readonly audience: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly nonce: string;
}

export interface GoogleOidcPort {
  startAuthorization(
    context: AuthenticationContext,
  ): Promise<GoogleAuthorizationRequest>;
  exchangeAndValidate(
    code: string,
    transaction: GoogleAuthorizationRequest,
    context: AuthenticationContext,
  ): Promise<GoogleClaims>;
}

export interface GoogleTransactionStorePort {
  save(transaction: GoogleAuthorizationRequest): void | Promise<void>;
  consume(
    state: string,
    now: Date,
  ):
    | GoogleAuthorizationRequest
    | null
    | Promise<GoogleAuthorizationRequest | null>;
}
