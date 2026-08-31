import { createPublicKey, createVerify } from 'node:crypto';
import type { DomainClockPort } from '../../../domain/ports/domain-clock.port';
import type {
  GoogleAuthorizationRequest,
  GoogleClaims,
} from '../../../application/ports/google-oidc.port';
import type {
  GoogleDiscoveryDocument,
  GoogleJwk,
  GoogleOidcConfig,
} from './google.types';
import {
  GOOGLE_CLOCK_SKEW_SECONDS,
  GOOGLE_ID_TOKEN_ALGORITHM,
  GOOGLE_JWT_PART_COUNT,
  GOOGLE_SECONDS_PER_MILLISECOND,
} from './google.constants';
import { AuthenticationError } from '../../../domain/errors/authentication.error';

export function parseJwt(token: string): {
  readonly encoded: string;
  readonly signature: string;
  readonly header: Record<string, unknown>;
  readonly claims: Record<string, unknown>;
} {
  const parts = token.split('.');
  if (
    parts.length !== GOOGLE_JWT_PART_COUNT ||
    parts[0] === undefined ||
    parts[1] === undefined ||
    parts[2] === undefined
  ) {
    throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
  }
  return {
    encoded: `${parts[0]}.${parts[1]}`,
    signature: parts[2],
    header: parseRecord(parts[0]),
    claims: parseRecord(parts[1]),
  };
}

export function verifySignature(
  encoded: string,
  signature: string,
  key: GoogleJwk,
): boolean {
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(encoded, 'ascii');
    verifier.end();
    return verifier.verify(
      createPublicKey({ key, format: 'jwk' }),
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    return false;
  }
}

export function toGoogleClaims(
  claims: Record<string, unknown>,
  transaction: GoogleAuthorizationRequest,
  config: GoogleOidcConfig,
  clock: DomainClockPort,
): GoogleClaims {
  const issuer = readString(claims, 'iss');
  const audience = readString(claims, 'aud');
  const subject = readString(claims, 'sub');
  const email = readString(claims, 'email');
  const nonce = readString(claims, 'nonce');
  const issuedAt = readNumber(claims, 'iat');
  const expiresAt = readNumber(claims, 'exp');
  const nowSeconds = Math.floor(
    clock.now().getTime() / GOOGLE_SECONDS_PER_MILLISECOND,
  );
  const values = {
    issuer,
    audience,
    subject,
    email,
    nonce,
    issuedAt,
    expiresAt,
  };
  if (!validClaims(values, { transaction, config, nowSeconds, claims })) {
    throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
  }
  return {
    subject: values.subject,
    email: values.email,
    name: readString(claims, 'name'),
    picture: readString(claims, 'picture'),
    issuer: values.issuer,
    audience: values.audience,
    issuedAt: values.issuedAt,
    expiresAt: values.expiresAt,
    nonce: values.nonce,
  };
}

function validClaims(
  values: {
    readonly issuer: string | null;
    readonly audience: string | null;
    readonly subject: string | null;
    readonly email: string | null;
    readonly nonce: string | null;
    readonly issuedAt: number | null;
    readonly expiresAt: number | null;
  },
  context: {
    readonly transaction: GoogleAuthorizationRequest;
    readonly config: GoogleOidcConfig;
    readonly nowSeconds: number;
    readonly claims: Record<string, unknown>;
  },
): values is {
  readonly issuer: string;
  readonly audience: string;
  readonly subject: string;
  readonly email: string;
  readonly nonce: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
} {
  return (
    values.issuer === context.config.issuer &&
    values.audience === context.config.clientId &&
    values.subject != null &&
    values.subject.length > 0 &&
    values.email != null &&
    values.nonce === context.transaction.nonce &&
    values.issuedAt != null &&
    values.expiresAt != null &&
    values.issuedAt <= context.nowSeconds + GOOGLE_CLOCK_SKEW_SECONDS &&
    values.expiresAt > context.nowSeconds - GOOGLE_CLOCK_SKEW_SECONDS &&
    values.expiresAt > values.issuedAt &&
    context.claims['email_verified'] === true
  );
}

export function toDiscoveryDocument(
  value: unknown,
  config: GoogleOidcConfig,
): GoogleDiscoveryDocument {
  const document = {
    issuer: readString(value, 'issuer'),
    authorizationEndpoint: readString(value, 'authorization_endpoint'),
    tokenEndpoint: readString(value, 'token_endpoint'),
    jwksUri: readString(value, 'jwks_uri'),
  };
  if (
    document.issuer !== config.issuer ||
    document.authorizationEndpoint == null ||
    document.tokenEndpoint == null ||
    document.jwksUri == null ||
    document.authorizationEndpoint !== config.authorizationEndpoint ||
    document.tokenEndpoint !== config.tokenEndpoint ||
    document.jwksUri !== config.jwksUri
  ) {
    throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
  }
  return {
    issuer: document.issuer,
    authorizationEndpoint: document.authorizationEndpoint,
    tokenEndpoint: document.tokenEndpoint,
    jwksUri: document.jwksUri,
  };
}

export function toGoogleJwk(value: unknown): GoogleJwk | null {
  if (
    !isRecord(value) ||
    typeof value['kid'] !== 'string' ||
    value['kty'] !== 'RSA' ||
    typeof value['n'] !== 'string' ||
    typeof value['e'] !== 'string' ||
    value['alg'] !== GOOGLE_ID_TOKEN_ALGORITHM ||
    value['use'] !== 'sig'
  ) {
    return null;
  }
  return {
    kid: value['kid'],
    kty: 'RSA',
    n: value['n'],
    e: value['e'],
    alg: GOOGLE_ID_TOKEN_ALGORITHM,
    use: 'sig',
  };
}

function readString(value: unknown, key: string): string | null {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : null;
}

function readNumber(value: unknown, key: string): number | null {
  return isRecord(value) &&
    typeof value[key] === 'number' &&
    Number.isFinite(value[key])
    ? value[key]
    : null;
}

function parseRecord(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    if (!isRecord(parsed)) {
      throw new Error('not-object');
    }
    return parsed;
  } catch {
    throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
