const DEFAULT_LOCAL_FRONTEND_ORIGIN = 'http://localhost:3000';
const DEFAULT_LOCAL_BACKEND_ORIGIN = 'http://localhost:8080';
export const DEFAULT_AUTH_ALLOWED_ORIGINS = [
  DEFAULT_LOCAL_FRONTEND_ORIGIN,
  'http://localhost:3001',
  DEFAULT_LOCAL_BACKEND_ORIGIN,
] as const;
export const DEFAULT_COOKIE_DOMAIN = 'localhost';
export const DEFAULT_TERMS_VERSION = 'v1';
export const DEFAULT_AUTH_PUBLIC_BASE_URL = DEFAULT_LOCAL_FRONTEND_ORIGIN;
export const DEFAULT_EMAIL_FROM = 'Example App <no-reply@localhost.test>';
export const DEFAULT_GOOGLE_ISSUER = 'https://accounts.google.com';
export const DEFAULT_GOOGLE_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth';
export const DEFAULT_GOOGLE_TOKEN_ENDPOINT =
  'https://oauth2.googleapis.com/token';
export const DEFAULT_GOOGLE_JWKS_URI =
  'https://www.googleapis.com/oauth2/v3/certs';
export const DEFAULT_GOOGLE_REDIRECT_URI =
  'http://localhost:8080/auth/google/callback';
export const GOOGLE_CALLBACK_PATH = '/auth/google/callback';
export const APPROVED_GOOGLE_ENDPOINTS = {
  issuer: DEFAULT_GOOGLE_ISSUER,
  authorization: DEFAULT_GOOGLE_AUTHORIZATION_ENDPOINT,
  token: DEFAULT_GOOGLE_TOKEN_ENDPOINT,
  jwks: DEFAULT_GOOGLE_JWKS_URI,
} as const;
export const MIN_FINGERPRINT_SECRET_LENGTH = 32;
export const MIN_GOOGLE_OAUTH_TRANSACTION_SECRET_LENGTH = 32;
export const GOOGLE_OAUTH_TRANSACTION_SECRET_ENV =
  'GOOGLE_OAUTH_TRANSACTION_SECRET';
export const MIN_EMAIL_DIAGNOSTIC_SECRET_LENGTH = 32;
export const RABBITMQ_URLS_ENV = 'RABBITMQ_URLS';
export const RABBITMQ_VHOST_ENV = 'RABBITMQ_VHOST';
export const MAX_AUTHENTICATION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const AUTHENTICATION_ORIGIN_PATTERN = /^https?:\/\/[^/]+$/;
export const AUTHENTICATION_COOKIE_DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
export const EMAIL_DOMAIN_SEPARATOR = '.';
export const MIN_EMAIL_DOMAIN_LENGTH = 3;
