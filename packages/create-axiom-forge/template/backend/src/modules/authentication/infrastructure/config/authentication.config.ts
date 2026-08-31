import type { AuthenticationConfig } from '../../application/ports/authentication-config.port';
import {
  DEFAULT_COOKIE_DOMAIN,
  APPROVED_GOOGLE_ENDPOINTS,
  DEFAULT_GOOGLE_AUTHORIZATION_ENDPOINT,
  DEFAULT_GOOGLE_ISSUER,
  DEFAULT_GOOGLE_JWKS_URI,
  DEFAULT_GOOGLE_REDIRECT_URI,
  DEFAULT_GOOGLE_TOKEN_ENDPOINT,
  DEFAULT_AUTH_ALLOWED_ORIGINS,
  DEFAULT_TERMS_VERSION,
  AUTHENTICATION_COOKIE_DOMAIN_PATTERN,
  AUTHENTICATION_ORIGIN_PATTERN,
  MAX_AUTHENTICATION_TTL_MS,
  MIN_FINGERPRINT_SECRET_LENGTH,
  GOOGLE_CALLBACK_PATH,
} from './authentication.constants';
import {
  readEmailConfiguration,
  validateAuthPublicBaseUrl,
} from './authentication-email.config';
import { parseRabbitMqUrls } from './rabbitmq.config';
import { readGoogleOAuthTransactionSecret } from './google-oauth.config';
import { requiredConfigText } from './authentication-value.config';

const SAFE_INTERNAL_REDIRECT_ORIGIN = 'https://application.invalid';
const ASCII_CONTROL_CHARACTER_MAX = 0x1f;
const DELETE_CHARACTER_CODE_POINT = 0x7f;
const C1_CONTROL_CHARACTER_MIN = 0x80;
const C1_CONTROL_CHARACTER_MAX = 0x9f;

export function loadAuthenticationConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthenticationConfig {
  const production = env['NODE_ENV'] === 'production';
  const fingerprintSecret = requiredSecret(env['AUTH_FINGERPRINT_SECRET']);
  const allowedOrigins = parseOrigins(
    env['AUTH_ALLOWED_ORIGINS'] ?? DEFAULT_AUTH_ALLOWED_ORIGINS.join(','),
  );
  const cookieDomain = env['AUTH_COOKIE_DOMAIN'] ?? DEFAULT_COOKIE_DOMAIN;
  const emailVerificationTtlMs = requiredPositiveNumber(
    env['AUTH_EMAIL_VERIFICATION_TTL_MS'],
    'AUTH_EMAIL_VERIFICATION_TTL_MS',
  );
  const emailConfiguration = readEmailConfiguration(env, production);
  const googleEnabled = env['GOOGLE_OIDC_ENABLED'] === 'true';
  const googleOAuthTransactionSecret = readGoogleOAuthTransactionSecret(
    env,
    googleEnabled,
  );
  const google = readGoogleConfiguration(env, googleEnabled);
  validateNetworkConfiguration(production, {
    allowedOrigins,
    cookieDomain,
    google,
    authPublicBaseUrl: emailConfiguration.authPublicBaseUrl,
  });
  return {
    fingerprintSecret,
    allowedOrigins,
    cookieDomain,
    secureCookies: production,
    redirectPath: safeInternalPath(env['AUTH_REDIRECT_PATH'] ?? '/'),
    termsVersion: requiredConfigText(
      env['AUTH_TERMS_VERSION'] ?? DEFAULT_TERMS_VERSION,
      'AUTH_TERMS_VERSION',
    ),
    emailVerificationTtlMs,
    emailProvider: emailConfiguration.emailProvider,
    resendApiKey: emailConfiguration.resendApiKey,
    resendEmailsReadApiKey: emailConfiguration.resendEmailsReadApiKey,
    emailFrom: emailConfiguration.emailFrom,
    authPublicBaseUrl: emailConfiguration.authPublicBaseUrl,
    emailDiagnosticsEnabled: emailConfiguration.emailDiagnosticsEnabled,
    emailDiagnosticsSecret: emailConfiguration.emailDiagnosticsSecret,
    rabbitMqUrls: parseRabbitMqUrls(env),
    googleEnabled,
    googleIssuer: google.issuer,
    googleClientId: google.clientId,
    googleClientSecret: google.clientSecret,
    googleOAuthTransactionSecret,
    googleAuthorizationEndpoint: google.authorizationEndpoint,
    googleTokenEndpoint: google.tokenEndpoint,
    googleJwksUri: google.jwksUri,
    googleRedirectUri: google.redirectUri,
  };
}

function safeInternalPath(value: string): string {
  if (hasUnsafeRedirectCharacters(value)) {
    return '/';
  }

  try {
    const resolvedUrl = new URL(value, SAFE_INTERNAL_REDIRECT_ORIGIN);
    return isSafeInternalRedirect(value, resolvedUrl) ? value : '/';
  } catch {
    return '/';
  }
}

function hasUnsafeRedirectCharacters(value: string): boolean {
  return (
    value.includes('\\') ||
    hasControlCharacter(value) ||
    value.includes('?') ||
    value.includes('#')
  );
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }
    return (
      codePoint <= ASCII_CONTROL_CHARACTER_MAX ||
      (codePoint >= C1_CONTROL_CHARACTER_MIN &&
        codePoint <= C1_CONTROL_CHARACTER_MAX) ||
      codePoint === DELETE_CHARACTER_CODE_POINT
    );
  });
}

function isSafeInternalRedirect(value: string, resolvedUrl: URL): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    resolvedUrl.origin === SAFE_INTERNAL_REDIRECT_ORIGIN &&
    resolvedUrl.username.length === 0 &&
    resolvedUrl.password.length === 0 &&
    resolvedUrl.search.length === 0 &&
    resolvedUrl.hash.length === 0
  );
}

function readGoogleConfiguration(
  env: NodeJS.ProcessEnv,
  enabled: boolean,
): {
  readonly enabled: boolean;
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly jwksUri: string;
  readonly redirectUri: string;
} {
  return {
    enabled,
    issuer: env['GOOGLE_OIDC_ISSUER'] ?? DEFAULT_GOOGLE_ISSUER,
    clientId: env['GOOGLE_CLIENT_ID'] ?? '',
    clientSecret: env['GOOGLE_CLIENT_SECRET'] ?? '',
    authorizationEndpoint:
      env['GOOGLE_AUTHORIZATION_ENDPOINT'] ??
      DEFAULT_GOOGLE_AUTHORIZATION_ENDPOINT,
    tokenEndpoint:
      env['GOOGLE_TOKEN_ENDPOINT'] ?? DEFAULT_GOOGLE_TOKEN_ENDPOINT,
    jwksUri: env['GOOGLE_JWKS_URI'] ?? DEFAULT_GOOGLE_JWKS_URI,
    redirectUri: env['GOOGLE_REDIRECT_URI'] ?? DEFAULT_GOOGLE_REDIRECT_URI,
  };
}

function requiredSecret(value: string | undefined): string {
  const secret = requiredConfigText(value, 'AUTH_FINGERPRINT_SECRET');
  if (secret.length < MIN_FINGERPRINT_SECRET_LENGTH) {
    throw new Error('AUTH_FINGERPRINT_SECRET is too short');
  }
  return secret;
}

function requiredPositiveNumber(
  value: string | undefined,
  name: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_AUTHENTICATION_TTL_MS
  ) {
    throw new Error(`${name} must be a positive safe integer within policy`);
  }
  return parsed;
}

function parseOrigins(value: string): ReadonlySet<string> {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (origins.length === 0) {
    throw new Error('AUTH_ALLOWED_ORIGINS must not be empty');
  }
  if (origins.some((origin) => !isValidOrigin(origin))) {
    throw new Error('AUTH_ALLOWED_ORIGINS contains an invalid origin');
  }
  return new Set(origins);
}

function validateNetworkConfiguration(
  production: boolean,
  configuration: Readonly<{
    allowedOrigins: ReadonlySet<string>;
    cookieDomain: string;
    google: {
      readonly enabled: boolean;
      readonly issuer: string;
      readonly clientId: string;
      readonly clientSecret: string;
      readonly authorizationEndpoint: string;
      readonly tokenEndpoint: string;
      readonly jwksUri: string;
      readonly redirectUri: string;
    };
    authPublicBaseUrl: string;
  }>,
): void {
  validateCookieNetwork(
    production,
    configuration.allowedOrigins,
    configuration.cookieDomain,
  );
  validateGoogleNetwork(
    production,
    configuration.allowedOrigins,
    configuration.google,
  );
  validateAuthPublicBaseUrl(
    configuration.authPublicBaseUrl,
    production,
    configuration.allowedOrigins,
  );
}

function validateCookieNetwork(
  production: boolean,
  allowedOrigins: ReadonlySet<string>,
  cookieDomain: string,
): void {
  if (
    production &&
    (cookieDomain === DEFAULT_COOKIE_DOMAIN || hasHttpOrigin(allowedOrigins))
  ) {
    throw new Error(
      'Production authentication requires HTTPS and a non-local cookie domain',
    );
  }
  if (!AUTHENTICATION_COOKIE_DOMAIN_PATTERN.test(cookieDomain)) {
    throw new Error('AUTH_COOKIE_DOMAIN must be a hostname');
  }
}

function validateGoogleNetwork(
  production: boolean,
  allowedOrigins: ReadonlySet<string>,
  google: {
    readonly enabled: boolean;
    readonly issuer: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly authorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly jwksUri: string;
    readonly redirectUri: string;
  },
): void {
  if (!google.enabled) {
    return;
  }
  if (google.clientId.length === 0 || google.clientSecret.length === 0) {
    throw new Error('Google OIDC credentials are required when enabled');
  }
  const approvedEndpoints: ReadonlyArray<readonly [string, string]> = [
    [google.issuer, APPROVED_GOOGLE_ENDPOINTS.issuer],
    [google.authorizationEndpoint, APPROVED_GOOGLE_ENDPOINTS.authorization],
    [google.tokenEndpoint, APPROVED_GOOGLE_ENDPOINTS.token],
    [google.jwksUri, APPROVED_GOOGLE_ENDPOINTS.jwks],
  ];
  if (
    approvedEndpoints.some(
      ([actual, approved]) =>
        actual !== approved || !isAllowedEndpoint(actual, production),
    ) ||
    !isExactGoogleRedirect(google.redirectUri, production) ||
    !originMatchesAllowlist(google.redirectUri, allowedOrigins)
  ) {
    throw new Error(
      'Google OIDC endpoints must be approved HTTPS URLs and the redirect origin must be allowed',
    );
  }
}

function isExactGoogleRedirect(value: string, production: boolean): boolean {
  try {
    const url = new URL(value);
    return (
      isAllowedEndpoint(value, production) &&
      url.pathname === GOOGLE_CALLBACK_PATH &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

function hasHttpOrigin(origins: ReadonlySet<string>): boolean {
  return [...origins].some((origin) => origin.startsWith('http://'));
}

function isAllowedEndpoint(value: string, production: boolean): boolean {
  try {
    const url = new URL(value);
    return production
      ? url.protocol === 'https:'
      : url.protocol === 'https:' || url.hostname === 'localhost';
  } catch {
    return false;
  }
}

function isValidOrigin(value: string): boolean {
  if (!AUTHENTICATION_ORIGIN_PATTERN.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.username.length === 0 && url.password.length === 0;
  } catch {
    return false;
  }
}

function originMatchesAllowlist(
  redirectUri: string,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  try {
    return allowedOrigins.has(new URL(redirectUri).origin);
  } catch {
    return false;
  }
}
