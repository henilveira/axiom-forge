import { createDevelopmentAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import type { AuthenticationConfig } from '../../../src/modules/authentication/application/ports/authentication-config.port';

const baseConfig: AuthenticationConfig = {
  fingerprintSecret: 'development-composition-secret-with-32-bytes',
  allowedOrigins: new Set(['http://localhost:3000']),
  cookieDomain: 'localhost',
  secureCookies: false,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'Example App <no-reply@localhost.test>',
  authPublicBaseUrl: 'http://localhost:3000',
  emailDiagnosticsEnabled: false,
  emailDiagnosticsSecret: '',
  rabbitMqUrls: [],
  googleEnabled: false,
  googleIssuer: 'https://accounts.google.com',
  googleClientId: '',
  googleClientSecret: '',
  googleOAuthTransactionSecret: 'google-oauth-transaction-test-secret-32-bytes',
  googleAuthorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenEndpoint: 'https://oauth2.googleapis.com/token',
  googleJwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  googleRedirectUri: 'http://localhost:3000/auth/google/callback',
};

describe('development authentication composition', () => {
  const originalDatabaseUrl = process.env['DATABASE_URL'];

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env['DATABASE_URL'];
    } else {
      process.env['DATABASE_URL'] = originalDatabaseUrl;
    }
  });

  it('keeps Google disabled without requiring PostgreSQL', async () => {
    delete process.env['DATABASE_URL'];

    const runtime = createDevelopmentAuthenticationRuntime(baseConfig);

    expect(runtime.config.googleEnabled).toBe(false);
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });

  it('creates the enabled Google runtime with the approved PostgreSQL driver', async () => {
    process.env['DATABASE_URL'] =
      'postgresql://user:password@localhost:5432/application?schema=public';

    const runtime = createDevelopmentAuthenticationRuntime({
      ...baseConfig,
      googleEnabled: true,
      googleClientId: 'local-client-id',
      googleClientSecret: 'local-client-secret',
    });

    expect(runtime.config.googleEnabled).toBe(true);
    await expect(runtime.shutdown()).resolves.toBeUndefined();
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });

  it('fails closed with an actionable error when Google is enabled without DATABASE_URL', () => {
    delete process.env['DATABASE_URL'];

    expect(() =>
      createDevelopmentAuthenticationRuntime({
        ...baseConfig,
        googleEnabled: true,
        googleClientId: 'local-client-id',
        googleClientSecret: 'local-client-secret',
      }),
    ).toThrow(
      'AUTH-001 development composition is unavailable: missing DATABASE_URL for PrismaGoogleTransactionStore',
    );
  });
});
