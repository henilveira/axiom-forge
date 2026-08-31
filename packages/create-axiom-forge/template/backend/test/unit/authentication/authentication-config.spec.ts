import { loadAuthenticationConfig } from '../../../src/modules/authentication/infrastructure/config/authentication.config';

const productionEnvironment = {
  NODE_ENV: 'production',
  AUTH_FINGERPRINT_SECRET: '01234567890123456789012345678901',
  AUTH_ALLOWED_ORIGINS: 'https://app.example.com',
  AUTH_COOKIE_DOMAIN: 'app.example.com',
  AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
  RESEND_API_KEY: 're_test-key',
  EMAIL_FROM: 'Example App <no-reply@app.example.com>',
  AUTH_PUBLIC_BASE_URL: 'https://app.example.com',
  AUTH_TERMS_VERSION: 'v1',
  GOOGLE_OIDC_ENABLED: 'true',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_OAUTH_TRANSACTION_SECRET:
    'google-oauth-transaction-production-secret-32-bytes',
  GOOGLE_REDIRECT_URI: 'https://app.example.com/auth/google/callback',
};

describe('authentication configuration', () => {
  it('accepts the exact environment callback URI', () => {
    expect(
      loadAuthenticationConfig(productionEnvironment).googleRedirectUri,
    ).toBe('https://app.example.com/auth/google/callback');
    expect(loadAuthenticationConfig(productionEnvironment).emailProvider).toBe(
      'resend',
    );
  });

  it('rejects a Google redirect path outside the fixed callback', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        GOOGLE_REDIRECT_URI: 'https://app.example.com/evil',
      }),
    ).toThrow('Google OIDC endpoints must be approved HTTPS URLs');
  });

  it('requires the OAuth transaction sealing secret when Google is enabled', () => {
    const environment = { ...productionEnvironment };
    delete environment.GOOGLE_OAUTH_TRANSACTION_SECRET;

    expect(() => loadAuthenticationConfig(environment)).toThrow(
      'GOOGLE_OAUTH_TRANSACTION_SECRET is required',
    );
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        GOOGLE_OAUTH_TRANSACTION_SECRET: 'too-short',
      }),
    ).toThrow('GOOGLE_OAUTH_TRANSACTION_SECRET is too short');
  });

  it('rejects a Google redirect with a query component', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        GOOGLE_REDIRECT_URI:
          'https://app.example.com/auth/google/callback?next=/evil',
      }),
    ).toThrow('Google OIDC endpoints must be approved HTTPS URLs');
  });

  it('requires Resend credentials, sender, and public base in production', () => {
    const missingResend = { ...productionEnvironment };
    delete missingResend.RESEND_API_KEY;
    expect(() => loadAuthenticationConfig(missingResend)).toThrow(
      'RESEND_API_KEY is required',
    );

    const missingSender = { ...productionEnvironment };
    delete missingSender.EMAIL_FROM;
    expect(() => loadAuthenticationConfig(missingSender)).toThrow(
      'EMAIL_FROM is required',
    );

    const missingBase = { ...productionEnvironment };
    delete missingBase.AUTH_PUBLIC_BASE_URL;
    expect(() => loadAuthenticationConfig(missingBase)).toThrow(
      'AUTH_PUBLIC_BASE_URL is required',
    );
  });
});

describe('authentication redirect path configuration', () => {
  it('preserves a valid internal application path', () => {
    expect(
      loadAuthenticationConfig({
        ...productionEnvironment,
        AUTH_REDIRECT_PATH: '/auth/complete',
      }).redirectPath,
    ).toBe('/auth/complete');
  });

  it.each([
    '/\\evil.example/',
    '/\\\\evil.example/',
    '//evil.example/',
    'https://evil.example/safe',
    'https://user:password@app.example.com/safe',
    '/safe/path?next=/evil',
    '/safe/path#fragment',
    '/safe/path\nwith-control',
    '/safe/path\u0000with-control',
  ])('falls back to the root for unsafe redirect path %j', (redirectPath) => {
    expect(
      loadAuthenticationConfig({
        ...productionEnvironment,
        AUTH_REDIRECT_PATH: redirectPath,
      }).redirectPath,
    ).toBe('/');
  });
});

describe('local e-mail provider configuration', () => {
  it('defaults local e-mail to in-memory and requires all Resend config when opted in', () => {
    const localEnvironment = {
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:8080',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
    };
    expect(loadAuthenticationConfig(localEnvironment).emailProvider).toBe(
      'in-memory',
    );
    expect(() =>
      loadAuthenticationConfig({
        ...localEnvironment,
        AUTH_EMAIL_PROVIDER: 'resend',
      }),
    ).toThrow('RESEND_API_KEY is required');
    const resendEnvironment = {
      ...localEnvironment,
      AUTH_EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test-key',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
    };
    const config = loadAuthenticationConfig(resendEnvironment);
    expect(config.emailProvider).toBe('resend');
    expect(config.emailFrom).toBe('henrique@example.com');
    expect(config.authPublicBaseUrl).toBe('http://localhost:3000');
  });

  it.each([undefined, '', '0', '-1', '1.5', '2592000001'])(
    'rejects an invalid e-mail verification TTL (%s)',
    (ttl) => {
      expect(() =>
        loadAuthenticationConfig({
          ...productionEnvironment,
          AUTH_EMAIL_VERIFICATION_TTL_MS: ttl,
        }),
      ).toThrow(
        'AUTH_EMAIL_VERIFICATION_TTL_MS must be a positive safe integer within policy',
      );
    },
  );

  it('rejects unsupported or unsafe provider selection', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        NODE_ENV: 'development',
        AUTH_EMAIL_PROVIDER: 'smtp',
      }),
    ).toThrow('AUTH_EMAIL_PROVIDER');
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        AUTH_EMAIL_PROVIDER: 'in-memory',
      }),
    ).toThrow('AUTH_EMAIL_PROVIDER must be "resend" in production');
  });
});

describe('authentication network configuration', () => {
  it('rejects an unsafe public base URL', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        AUTH_PUBLIC_BASE_URL: 'https://api.example.com/auth?next=/login',
      }),
    ).toThrow('AUTH_PUBLIC_BASE_URL');
  });

  it('requires the public base URL origin to be explicitly allowed', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        AUTH_PUBLIC_BASE_URL: 'https://api.example.com',
      }),
    ).toThrow(
      'AUTH_PUBLIC_BASE_URL must match an allowed authentication origin',
    );
  });

  it('accepts the configured local browser origins and one link base URL', () => {
    const config = loadAuthenticationConfig({
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS:
        'http://localhost:3000,http://localhost:3001,http://localhost:8080',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
      AUTH_TERMS_VERSION: 'v1',
      GOOGLE_OIDC_ENABLED: 'false',
    });

    expect(config.authPublicBaseUrl).toBe('http://localhost:3000');
    expect(config.emailFrom).toBe('henrique@example.com');
    expect(config.allowedOrigins).toEqual(
      new Set([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
      ]),
    );
  });
});

describe('RabbitMQ configuration', () => {
  it('composes the documented vhost into an AMQP URL without a path', () => {
    const config = loadAuthenticationConfig({
      ...productionEnvironment,
      RABBITMQ_URLS: 'amqp://localhost:5672',
      RABBITMQ_VHOST: '/application-local',
    });

    expect(config.rabbitMqUrls).toEqual([
      'amqp://localhost:5672/%2Fapplication-local',
    ]);
  });

  it('accepts a matching encoded vhost and rejects conflicting sources', () => {
    expect(
      loadAuthenticationConfig({
        ...productionEnvironment,
        RABBITMQ_URLS: 'amqp://localhost:5672/%2Fapplication-local',
        RABBITMQ_VHOST: '/application-local',
      }).rabbitMqUrls,
    ).toEqual(['amqp://localhost:5672/%2Fapplication-local']);

    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        RABBITMQ_URLS: 'amqp://localhost:5672/other-vhost',
        RABBITMQ_VHOST: '/application-local',
      }),
    ).toThrow('RABBITMQ_URLS vhost conflicts with RABBITMQ_VHOST');
  });

  it('rejects control characters in the vhost configuration', () => {
    expect(() =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        RABBITMQ_URLS: 'amqp://localhost:5672',
        RABBITMQ_VHOST: '/application\nlocal',
      }),
    ).toThrow('RABBITMQ_VHOST contains invalid control characters');
  });
});

describe('authentication diagnostics configuration', () => {
  it('enables diagnostics only in development with a separate secret and read key', () => {
    const config = loadAuthenticationConfig({
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      AUTH_EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'send-key',
      RESEND_EMAILS_READ_API_KEY: 'read-key',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
      AUTH_EMAIL_DIAGNOSTICS_ENABLED: 'true',
      AUTH_EMAIL_DIAGNOSTIC_SECRET:
        'diagnostic-secret-with-at-least-32-characters',
    });
    expect(config.emailDiagnosticsEnabled).toBe(true);
    expect(config.emailDiagnosticsSecret).toBe(
      'diagnostic-secret-with-at-least-32-characters',
    );
    expect(config.resendEmailsReadApiKey).toBe('read-key');

    const fallbackConfig = loadAuthenticationConfig({
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      AUTH_EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'send-key',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
      AUTH_EMAIL_DIAGNOSTICS_ENABLED: 'true',
      AUTH_EMAIL_DIAGNOSTIC_SECRET:
        'diagnostic-secret-with-at-least-32-characters',
    });
    expect(fallbackConfig.resendEmailsReadApiKey).toBe('send-key');
  });

  it('fails closed when enabled diagnostics lack a secret or read key', () => {
    const environment = {
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
      AUTH_EMAIL_DIAGNOSTICS_ENABLED: 'true',
    };
    expect(() => loadAuthenticationConfig(environment)).toThrow(
      'RESEND_EMAILS_READ_API_KEY or RESEND_API_KEY is required',
    );
    expect(() =>
      loadAuthenticationConfig({
        ...environment,
        RESEND_API_KEY: 'send-key',
      }),
    ).toThrow('AUTH_EMAIL_DIAGNOSTIC_SECRET is required');
  });

  it('ignores diagnostics configuration outside development', () => {
    const config = loadAuthenticationConfig({
      ...productionEnvironment,
      AUTH_EMAIL_DIAGNOSTICS_ENABLED: 'true',
      AUTH_EMAIL_DIAGNOSTIC_SECRET: 'must-not-be-read',
    });
    expect(config.emailDiagnosticsEnabled).toBe(false);
    expect(config.emailDiagnosticsSecret).toBe('');
    expect(config.resendEmailsReadApiKey).toBe('');
  });

  it('requires a sufficiently long secret distinct from both Resend API keys', () => {
    const environment = {
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: productionEnvironment.AUTH_FINGERPRINT_SECRET,
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      AUTH_EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'send-key',
      EMAIL_FROM: 'henrique@example.com',
      AUTH_PUBLIC_BASE_URL: 'http://localhost:3000',
      AUTH_EMAIL_DIAGNOSTICS_ENABLED: 'true',
    };
    for (const secret of ['x'.repeat(31), 'send-key']) {
      expect(() =>
        loadAuthenticationConfig({
          ...environment,
          AUTH_EMAIL_DIAGNOSTIC_SECRET: secret,
        }),
      ).toThrow('AUTH_EMAIL_DIAGNOSTIC_SECRET must be at least 32 characters');
    }
    expect(() =>
      loadAuthenticationConfig({
        ...environment,
        AUTH_EMAIL_DIAGNOSTIC_SECRET: 'x'.repeat(32),
      }),
    ).not.toThrow();
    expect(() =>
      loadAuthenticationConfig({
        ...environment,
        RESEND_API_KEY: 's'.repeat(32),
        AUTH_EMAIL_DIAGNOSTIC_SECRET: 's'.repeat(32),
      }),
    ).toThrow('AUTH_EMAIL_DIAGNOSTIC_SECRET must be at least 32 characters');

    const sharedWithSendingKey = 'sending-key-shared-with-diagnostic-secret';
    expect(() =>
      loadAuthenticationConfig({
        ...environment,
        RESEND_API_KEY: sharedWithSendingKey,
        RESEND_EMAILS_READ_API_KEY: 'read-key-distinct-from-sending-key',
        AUTH_EMAIL_DIAGNOSTIC_SECRET: sharedWithSendingKey,
      }),
    ).toThrow('AUTH_EMAIL_DIAGNOSTIC_SECRET must be at least 32 characters');
  });
});
