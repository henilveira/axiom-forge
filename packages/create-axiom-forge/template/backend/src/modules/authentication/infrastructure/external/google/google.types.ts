export interface GoogleOidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly jwksUri: string;
  readonly redirectUri: string;
  readonly enabled: boolean;
}

export interface GoogleDiscoveryDocument {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly jwksUri: string;
}

import type { JsonWebKey } from 'node:crypto';

export interface GoogleJwk extends JsonWebKey {
  readonly kid: string;
  readonly kty: 'RSA';
  readonly n: string;
  readonly e: string;
  readonly alg: 'RS256';
  readonly use: 'sig';
}

export interface GoogleTokenResponse {
  readonly idToken: string;
}

export interface CachedDiscovery {
  readonly value: GoogleDiscoveryDocument;
  readonly expiresAt: number;
}

export interface CachedJwk {
  readonly value: GoogleJwk;
  readonly expiresAt: number;
}

export interface GoogleOAuthTransactionRow {
  readonly stateHash: string;
  readonly sealedPayload: string;
  readonly expiresAt: Date;
}

export interface GoogleOAuthTransactionPayload {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly expiresAt: string;
  readonly browserBinding: string;
  readonly correlationId: string;
}

export interface GoogleOAuthTransactionEnvelope {
  readonly iv: Buffer;
  readonly tag: Buffer;
  readonly ciphertext: Buffer;
}
