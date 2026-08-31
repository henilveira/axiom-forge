import { createHash } from 'node:crypto';
import { AuthenticationError } from '../../../domain/errors/authentication.error';
import type { DomainClockPort } from '../../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../../domain/ports/domain-random.port';
import type { AuthenticationContext } from '../../../domain/types/authentication.types';
import type {
  GoogleAuthorizationRequest,
  GoogleClaims,
  GoogleOidcPort,
  GoogleTransactionStorePort,
} from '../../../application/ports/google-oidc.port';
import type {
  CachedDiscovery,
  CachedJwk,
  GoogleDiscoveryDocument,
  GoogleJwk,
  GoogleOidcConfig,
  GoogleTokenResponse,
} from './google.types';
import {
  GOOGLE_CODE_VERIFIER_MIN_LENGTH,
  GOOGLE_DISCOVERY_CACHE_TTL_MS,
  GOOGLE_ID_TOKEN_ALGORITHM,
  GOOGLE_JWKS_CACHE_TTL_MS,
  GOOGLE_OIDC_SCOPE,
  GOOGLE_PKCE_METHOD,
  GOOGLE_PROVIDER_TIMEOUT_MS,
  GOOGLE_TOKEN_BYTES,
  GOOGLE_TRANSACTION_TTL_MS,
  GOOGLE_MAX_RESPONSE_BYTES,
} from './google.constants';
import {
  parseJwt,
  toDiscoveryDocument,
  toGoogleClaims,
  toGoogleJwk,
  verifySignature,
} from './google-oidc.schema';

export class GoogleOidcAdapter implements GoogleOidcPort {
  private discovery: CachedDiscovery | null = null;
  private readonly jwks = new Map<string, CachedJwk>();

  public constructor(
    private readonly config: GoogleOidcConfig,
    private readonly random: DomainRandomPort,
    private readonly clock: DomainClockPort,
    private readonly transactions: GoogleTransactionStorePort,
  ) {}

  public async startAuthorization(
    context: AuthenticationContext,
  ): Promise<GoogleAuthorizationRequest> {
    this.assertEnabled();
    const browserBinding = context.browserBinding;
    if (browserBinding === undefined || browserBinding.length === 0) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    const state = toBase64Url(this.random.bytes(GOOGLE_TOKEN_BYTES));
    const nonce = toBase64Url(this.random.bytes(GOOGLE_TOKEN_BYTES));
    const codeVerifier = toBase64Url(this.random.bytes(GOOGLE_TOKEN_BYTES));
    const request = this.createAuthorizationRequest({
      state,
      nonce,
      codeVerifier,
      browserBinding,
      correlationId: context.correlationId,
    });
    await this.transactions.save(request);
    return request;
  }

  public async exchangeAndValidate(
    code: string,
    transaction: GoogleAuthorizationRequest,
    context: AuthenticationContext,
  ): Promise<GoogleClaims> {
    this.assertEnabled();
    if (
      code.length === 0 ||
      transaction.codeVerifier.length < GOOGLE_CODE_VERIFIER_MIN_LENGTH ||
      transaction.browserBinding.length === 0 ||
      transaction.browserBinding !== (context.browserBinding ?? '')
    ) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    const tokenResponse = await this.exchangeCode(
      code,
      transaction.codeVerifier,
    );
    return await this.validateIdToken(
      tokenResponse.idToken,
      transaction,
      await this.loadDiscovery(),
    );
  }

  private createAuthorizationRequest(input: {
    readonly state: string;
    readonly nonce: string;
    readonly codeVerifier: string;
    readonly browserBinding: string;
    readonly correlationId: string;
  }): GoogleAuthorizationRequest {
    const url = new URL(this.config.authorizationEndpoint);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_OIDC_SCOPE);
    url.searchParams.set('state', input.state);
    url.searchParams.set('nonce', input.nonce);
    url.searchParams.set(
      'code_challenge',
      this.base64UrlSha256(input.codeVerifier),
    );
    url.searchParams.set('code_challenge_method', GOOGLE_PKCE_METHOD);
    return {
      authorizationUrl: url.toString(),
      state: input.state,
      nonce: input.nonce,
      codeVerifier: input.codeVerifier,
      expiresAt: this.clock.at(GOOGLE_TRANSACTION_TTL_MS),
      browserBinding: input.browserBinding,
      correlationId: input.correlationId,
    };
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams();
    body.set('code', code);
    body.set('client_id', this.config.clientId);
    body.set('client_secret', this.config.clientSecret);
    body.set('redirect_uri', this.config.redirectUri);
    body.set('grant_type', 'authorization_code');
    body.set('code_verifier', codeVerifier);
    const headers = new Headers();
    headers.set('content-type', 'application/x-www-form-urlencoded');
    const parsed = await this.fetchJson(this.config.tokenEndpoint, {
      method: 'POST',
      headers,
      body,
    });
    const idToken = readString(parsed, 'id_token');
    if (idToken == null) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    return { idToken };
  }

  private async loadDiscovery(): Promise<GoogleDiscoveryDocument> {
    const now = this.clock.now().getTime();
    if (this.discovery != null && this.discovery.expiresAt > now) {
      return this.discovery.value;
    }
    const parsed = await this.fetchJson(
      `${this.config.issuer}/.well-known/openid-configuration`,
    );
    const document = toDiscoveryDocument(parsed, this.config);
    this.discovery = {
      value: document,
      expiresAt: now + GOOGLE_DISCOVERY_CACHE_TTL_MS,
    };
    return document;
  }

  private async validateIdToken(
    token: string,
    transaction: GoogleAuthorizationRequest,
    discovery: GoogleDiscoveryDocument,
  ): Promise<GoogleClaims> {
    const jwt = parseJwt(token);
    if (
      jwt.header['alg'] !== GOOGLE_ID_TOKEN_ALGORITHM ||
      typeof jwt.header['kid'] !== 'string'
    ) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    const key = await this.keyFor(jwt.header['kid'], discovery.jwksUri);
    if (!verifySignature(jwt.encoded, jwt.signature, key)) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    return toGoogleClaims(jwt.claims, transaction, this.config, this.clock);
  }

  private async keyFor(kid: string, jwksUri: string): Promise<GoogleJwk> {
    const now = this.clock.now().getTime();
    const cached = this.jwks.get(kid);
    if (cached !== undefined && cached.expiresAt > now) {
      return cached.value;
    }
    const parsed = await this.fetchJson(jwksUri);
    if (!isRecord(parsed) || !Array.isArray(parsed['keys'])) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    for (const candidate of parsed['keys']) {
      const key = toGoogleJwk(candidate);
      if (key != null) {
        this.jwks.set(key.kid, {
          value: key,
          expiresAt: now + GOOGLE_JWKS_CACHE_TTL_MS,
        });
      }
    }
    const result = this.jwks.get(kid);
    if (result === undefined) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    return result.value;
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, GOOGLE_PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AuthenticationError(
          'PROVIDER_UNAVAILABLE',
          'PROVIDER_UNAVAILABLE',
        );
      }
      const text = await readResponseText(response);
      try {
        return JSON.parse(text);
      } catch {
        throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
      }
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        'PROVIDER_UNAVAILABLE',
        'PROVIDER_UNAVAILABLE',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private base64UrlSha256(value: string): string {
    return createHash('sha256').update(value, 'ascii').digest('base64url');
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
  }
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

async function readResponseText(response: Response): Promise<string> {
  if (response.body == null) {
    return await readUnstreamedResponse(response);
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > GOOGLE_MAX_RESPONSE_BYTES) {
      throw new AuthenticationError(
        'PROVIDER_UNAVAILABLE',
        'PROVIDER_UNAVAILABLE',
      );
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readUnstreamedResponse(response: Response): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (
    contentLength == null ||
    !isSafeContentLength(contentLength) ||
    Number(contentLength) > GOOGLE_MAX_RESPONSE_BYTES
  ) {
    throw new AuthenticationError(
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_UNAVAILABLE',
    );
  }
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > GOOGLE_MAX_RESPONSE_BYTES) {
    throw new AuthenticationError(
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_UNAVAILABLE',
    );
  }
  return text;
}

function isSafeContentLength(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function readString(value: unknown, key: string): string | null {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
