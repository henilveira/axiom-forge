import { loadAuthenticationConfig } from '../../src/modules/authentication/infrastructure/config/authentication.config';

export interface LiveSmokeSetup {
  readonly enabled: boolean;
  readonly error?: string;
  readonly recipient?: string;
  readonly configuration?: ReturnType<typeof loadAuthenticationConfig>;
}

export function prepareLiveSmoke(env: NodeJS.ProcessEnv): LiveSmokeSetup {
  if (env['AUTH_EMAIL_LIVE_TEST'] !== 'true') {
    return { enabled: false };
  }
  if (env['CI'] === 'true') {
    return {
      enabled: true,
      error: 'AUTH_EMAIL_LIVE_TEST is not allowed in CI',
    };
  }
  if (env['NODE_ENV'] !== 'development') {
    return {
      enabled: true,
      error: 'AUTH_EMAIL_LIVE_TEST requires NODE_ENV=development',
    };
  }

  const recipient = env['AUTH_EMAIL_SMOKE_RECIPIENT']?.trim();
  if (recipient === undefined || !isMailbox(recipient)) {
    return {
      enabled: true,
      error: 'AUTH_EMAIL_SMOKE_RECIPIENT must be an explicit valid mailbox',
    };
  }

  try {
    const configuration = loadAuthenticationConfig(env);
    if (configuration.emailProvider !== 'resend') {
      return {
        enabled: true,
        error: 'AUTH_EMAIL_PROVIDER must be resend for the live smoke',
      };
    }
    return { enabled: true, recipient, configuration };
  } catch {
    return {
      enabled: true,
      error: 'authentication e-mail configuration is invalid for live smoke',
    };
  }
}

function isMailbox(value: string): boolean {
  const at = value.indexOf('@');
  const domain = at >= 0 ? value.slice(at + 1) : '';
  return (
    at > 0 &&
    value.lastIndexOf('@') === at &&
    domain.includes('.') &&
    !value.includes(' ') &&
    !value.includes('\r') &&
    !value.includes('\n')
  );
}
