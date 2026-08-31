import {
  DEFAULT_AUTH_PUBLIC_BASE_URL,
  DEFAULT_EMAIL_FROM,
  EMAIL_DOMAIN_SEPARATOR,
  MIN_EMAIL_DOMAIN_LENGTH,
  MIN_EMAIL_DIAGNOSTIC_SECRET_LENGTH,
} from './authentication.constants';
import type { AuthenticationEmailProvider } from '../../application/ports/authentication-config.port';

export function readEmailConfiguration(
  env: NodeJS.ProcessEnv,
  production: boolean,
): {
  readonly emailProvider: AuthenticationEmailProvider;
  readonly resendApiKey: string;
  readonly resendEmailsReadApiKey: string;
  readonly emailFrom: string;
  readonly authPublicBaseUrl: string;
  readonly emailDiagnosticsEnabled: boolean;
  readonly emailDiagnosticsSecret: string;
} {
  const emailProvider = readEmailProvider(env, production);
  const resendConfigured = emailProvider === 'resend';
  const resendApiKey = resendConfigured
    ? requiredText(env['RESEND_API_KEY'], 'RESEND_API_KEY')
    : (env['RESEND_API_KEY'] ?? '');
  const emailFrom = resendConfigured
    ? requiredText(env['EMAIL_FROM'], 'EMAIL_FROM')
    : (env['EMAIL_FROM'] ?? DEFAULT_EMAIL_FROM);
  const authPublicBaseUrl = resendConfigured
    ? requiredText(env['AUTH_PUBLIC_BASE_URL'], 'AUTH_PUBLIC_BASE_URL')
    : (env['AUTH_PUBLIC_BASE_URL'] ?? DEFAULT_AUTH_PUBLIC_BASE_URL);
  if (!isValidEmailFrom(emailFrom)) {
    throw new Error('EMAIL_FROM must be a valid sender address');
  }
  const diagnostics = readEmailDiagnosticsConfiguration(
    env,
    production,
    resendApiKey,
  );
  return {
    emailProvider,
    resendApiKey,
    emailFrom,
    authPublicBaseUrl,
    ...diagnostics,
  };
}

export function isEmailDiagnosticsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env['NODE_ENV'] === 'development' &&
    env['AUTH_EMAIL_DIAGNOSTICS_ENABLED'] === 'true'
  );
}

function readEmailDiagnosticsConfiguration(
  env: NodeJS.ProcessEnv,
  production: boolean,
  resendApiKey: string,
): {
  readonly resendEmailsReadApiKey: string;
  readonly emailDiagnosticsEnabled: boolean;
  readonly emailDiagnosticsSecret: string;
} {
  const enabled = !production && isEmailDiagnosticsEnabled(env);
  if (!enabled) {
    return {
      resendEmailsReadApiKey: '',
      emailDiagnosticsEnabled: false,
      emailDiagnosticsSecret: '',
    };
  }
  const configuredReadApiKey = env['RESEND_EMAILS_READ_API_KEY']?.trim();
  const readApiKey =
    configuredReadApiKey !== undefined && configuredReadApiKey.length > 0
      ? configuredReadApiKey
      : resendApiKey;
  const requiredReadApiKey = requiredText(
    readApiKey,
    'RESEND_EMAILS_READ_API_KEY or RESEND_API_KEY',
  );
  const diagnosticSecret = requiredDiagnosticSecret(
    env['AUTH_EMAIL_DIAGNOSTIC_SECRET'],
    resendApiKey,
    requiredReadApiKey,
  );
  return {
    resendEmailsReadApiKey: requiredReadApiKey,
    emailDiagnosticsEnabled: true,
    emailDiagnosticsSecret: diagnosticSecret,
  };
}

function requiredDiagnosticSecret(
  value: string | undefined,
  resendApiKey: string,
  readApiKey: string,
): string {
  const secret = requiredText(value, 'AUTH_EMAIL_DIAGNOSTIC_SECRET');
  if (
    secret.length < MIN_EMAIL_DIAGNOSTIC_SECRET_LENGTH ||
    secret === resendApiKey ||
    secret === readApiKey
  ) {
    throw new Error(
      'AUTH_EMAIL_DIAGNOSTIC_SECRET must be at least 32 characters and differ from the Resend API key',
    );
  }
  return secret;
}

function readEmailProvider(
  env: NodeJS.ProcessEnv,
  production: boolean,
): AuthenticationEmailProvider {
  if (!production && env['NODE_ENV'] === 'test') {
    return 'in-memory';
  }
  const configured = env['AUTH_EMAIL_PROVIDER']?.trim().toLowerCase();
  const provider = configured ?? (production ? 'resend' : 'in-memory');
  if (provider !== 'in-memory' && provider !== 'resend') {
    throw new Error('AUTH_EMAIL_PROVIDER must be "in-memory" or "resend"');
  }
  if (production && provider !== 'resend') {
    throw new Error('AUTH_EMAIL_PROVIDER must be "resend" in production');
  }
  return provider;
}

export function validateAuthPublicBaseUrl(
  value: string,
  production: boolean,
  allowedOrigins: ReadonlySet<string>,
): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('AUTH_PUBLIC_BASE_URL must be an absolute URL');
  }
  if (
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        !production &&
        url.hostname === 'localhost'
      )) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0 ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'AUTH_PUBLIC_BASE_URL must be an HTTPS origin without credentials, path, query or fragment',
    );
  }
  if (!allowedOrigins.has(url.origin)) {
    throw new Error(
      'AUTH_PUBLIC_BASE_URL must match an allowed authentication origin',
    );
  }
}

function requiredText(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function isValidEmailFrom(value: string): boolean {
  const mailbox = extractMailbox(value);
  return (
    mailbox != null && isValidMailbox(mailbox) && hasNoHeaderControls(value)
  );
}

function extractMailbox(value: string): string | null {
  const trimmed = value.trim();
  const opening = trimmed.lastIndexOf('<');
  const closing = trimmed.lastIndexOf('>');
  if (opening === -1 && closing === -1) {
    return trimmed;
  }
  if (
    opening <= 0 ||
    closing !== trimmed.length - 1 ||
    trimmed.indexOf('<') !== opening ||
    trimmed.indexOf('>') !== closing
  ) {
    return null;
  }
  return trimmed.slice(opening + 1, closing).trim();
}

function isValidMailbox(value: string): boolean {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) {
    return false;
  }
  const domain = value.slice(atIndex + 1);
  const domainSeparator = domain.lastIndexOf(EMAIL_DOMAIN_SEPARATOR);
  return (
    domain.length >= MIN_EMAIL_DOMAIN_LENGTH &&
    domainSeparator > 0 &&
    domain.length - domainSeparator > MIN_EMAIL_DOMAIN_LENGTH - 1 &&
    !value.includes(' ')
  );
}

function hasNoHeaderControls(value: string): boolean {
  return !value.includes('\r') && !value.includes('\n');
}
