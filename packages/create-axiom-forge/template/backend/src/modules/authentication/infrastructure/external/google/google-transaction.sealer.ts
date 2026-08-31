import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { GoogleAuthorizationRequest } from '../../../application/ports/google-oidc.port';
import { MIN_GOOGLE_OAUTH_TRANSACTION_SECRET_LENGTH } from '../../config/authentication.constants';
import {
  GOOGLE_OAUTH_TRANSACTION_AAD_PREFIX,
  GOOGLE_OAUTH_TRANSACTION_AEAD_ALGORITHM,
  GOOGLE_OAUTH_TRANSACTION_ENVELOPE_PARTS,
  GOOGLE_OAUTH_TRANSACTION_FORMAT_VERSION,
  GOOGLE_OAUTH_TRANSACTION_IV_BYTES,
  GOOGLE_OAUTH_TRANSACTION_TAG_BYTES,
} from './google.constants';
import type {
  GoogleOAuthTransactionEnvelope,
  GoogleOAuthTransactionPayload,
} from './google.types';

export class GoogleOAuthTransactionSealer {
  private readonly key: Buffer;
  private readonly stateHashKey: Buffer;

  public constructor(secret: string) {
    const normalizedSecret = secret.trim();
    if (normalizedSecret.length < MIN_GOOGLE_OAUTH_TRANSACTION_SECRET_LENGTH) {
      throw new Error('GOOGLE_OAUTH_TRANSACTION_SECRET is too short');
    }
    this.key = createHash('sha256')
      .update(
        `${GOOGLE_OAUTH_TRANSACTION_AAD_PREFIX}/aead\u0000${normalizedSecret}`,
        'utf8',
      )
      .digest();
    this.stateHashKey = createHash('sha256')
      .update(
        `${GOOGLE_OAUTH_TRANSACTION_AAD_PREFIX}/state-index\u0000${normalizedSecret}`,
        'utf8',
      )
      .digest();
  }

  public stateHash(state: string): string {
    return createHmac('sha256', this.stateHashKey)
      .update(state, 'utf8')
      .digest('hex');
  }

  public seal(transaction: GoogleAuthorizationRequest): string {
    const iv = randomBytes(GOOGLE_OAUTH_TRANSACTION_IV_BYTES);
    const cipher = createCipheriv(
      GOOGLE_OAUTH_TRANSACTION_AEAD_ALGORITHM,
      this.key,
      iv,
    );
    const stateHash = this.stateHash(transaction.state);
    const expiresAt = transaction.expiresAt.toISOString();
    cipher.setAAD(this.aad(stateHash, expiresAt));
    const payload: GoogleOAuthTransactionPayload = {
      authorizationUrl: transaction.authorizationUrl,
      state: transaction.state,
      nonce: transaction.nonce,
      codeVerifier: transaction.codeVerifier,
      expiresAt,
      browserBinding: transaction.browserBinding,
      correlationId: transaction.correlationId,
    };
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      GOOGLE_OAUTH_TRANSACTION_FORMAT_VERSION,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  public open(
    state: string,
    stateHash: string,
    sealedPayload: string,
    expiresAt: Date,
  ): GoogleAuthorizationRequest {
    const expectedStateHash = this.stateHash(state);
    if (!safeEqual(expectedStateHash, stateHash)) {
      throw new Error('invalid Google OAuth transaction state');
    }
    const { iv, tag, ciphertext } = parseEnvelope(sealedPayload);
    const decipher = createDecipheriv(
      GOOGLE_OAUTH_TRANSACTION_AEAD_ALGORITHM,
      this.key,
      iv,
    );
    const expiresAtIso = expiresAt.toISOString();
    decipher.setAAD(this.aad(stateHash, expiresAtIso));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
    const payload = parsePayload(JSON.parse(plaintext));
    if (payload.state !== state || payload.expiresAt !== expiresAtIso) {
      throw new Error('invalid Google OAuth transaction payload');
    }
    return {
      authorizationUrl: payload.authorizationUrl,
      state: payload.state,
      nonce: payload.nonce,
      codeVerifier: payload.codeVerifier,
      expiresAt,
      browserBinding: payload.browserBinding,
      correlationId: payload.correlationId,
    };
  }

  private aad(stateHash: string, expiresAt: string): Buffer {
    return Buffer.from(
      `${GOOGLE_OAUTH_TRANSACTION_AAD_PREFIX}|${stateHash}|${expiresAt}`,
      'utf8',
    );
  }
}

function parseEnvelope(sealedPayload: string): GoogleOAuthTransactionEnvelope {
  const parts = sealedPayload.split('.');
  const version = parts[0];
  const encodedIv = parts[1];
  const encodedTag = parts[2];
  const encodedCiphertext = parts[3];
  if (
    parts.length !== GOOGLE_OAUTH_TRANSACTION_ENVELOPE_PARTS ||
    version !== GOOGLE_OAUTH_TRANSACTION_FORMAT_VERSION ||
    encodedIv == null ||
    encodedTag == null ||
    encodedCiphertext == null
  ) {
    throw new Error('invalid Google OAuth transaction envelope');
  }
  const iv = Buffer.from(encodedIv, 'base64url');
  const tag = Buffer.from(encodedTag, 'base64url');
  const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
  if (
    iv.length !== GOOGLE_OAUTH_TRANSACTION_IV_BYTES ||
    tag.length !== GOOGLE_OAUTH_TRANSACTION_TAG_BYTES ||
    ciphertext.length === 0
  ) {
    throw new Error('invalid Google OAuth transaction envelope');
  }
  return { iv, tag, ciphertext };
}

function parsePayload(value: unknown): GoogleOAuthTransactionPayload {
  if (!isRecord(value)) {
    throw new Error('invalid Google OAuth transaction payload');
  }
  const authorizationUrl = readString(value, 'authorizationUrl');
  const state = readString(value, 'state');
  const nonce = readString(value, 'nonce');
  const codeVerifier = readString(value, 'codeVerifier');
  const expiresAt = readString(value, 'expiresAt');
  const browserBinding = readString(value, 'browserBinding');
  const correlationId = readString(value, 'correlationId');
  if (
    authorizationUrl == null ||
    state == null ||
    nonce == null ||
    codeVerifier == null ||
    expiresAt == null ||
    browserBinding == null ||
    correlationId == null
  ) {
    throw new Error('invalid Google OAuth transaction payload');
  }
  return {
    authorizationUrl,
    state,
    nonce,
    codeVerifier,
    expiresAt,
    browserBinding,
    correlationId,
  };
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
