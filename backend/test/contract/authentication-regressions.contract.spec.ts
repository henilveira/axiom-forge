import { loadAuthenticationConfig } from '../../src/modules/authentication/infrastructure/config/authentication.config';
import { parseAuthenticationEnvelope } from '../../src/modules/authentication/infrastructure/messaging/contracts/authentication-envelope.schema';
import { isoDate } from '../test-kit/authentication.builders';

const validData = {
  type: 'EmailVerified',
  userId: 'user-1',
  occurredAt: isoDate(),
};

const validEnvelope = {
  messageId: 'message-regression-1',
  eventId: 'event-regression-1',
  eventType: 'identity.authentication.EmailVerified.v1',
  eventVersion: 1,
  schemaVersion: 1,
  occurredAt: isoDate(),
  producer: 'backend.identity',
  correlationId: 'correlation-regression-1',
  causationId: null,
  tenantId: null,
  data: validData,
};

describe('AUTH-001 regressions from final validation', () => {
  it('rejects an event outside the identity.authentication namespace', () => {
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        eventType: 'attacker.other.EmailVerified.v1',
      }),
    ).toBeNull();
  });

  it('rejects a Google callback path that is not the exact registered path', () => {
    const invalidProductionEnvironment = {
      NODE_ENV: 'production',
      AUTH_FINGERPRINT_SECRET: 'auth001-production-secret-with-32-bytes',
      AUTH_ALLOWED_ORIGINS: 'https://app.example.test',
      AUTH_COOKIE_DOMAIN: 'app.example.test',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '600000',
      RESEND_API_KEY: 're_test-key',
      EMAIL_FROM: 'Example App <no-reply@app.example.test>',
      AUTH_PUBLIC_BASE_URL: 'https://app.example.test',
      GOOGLE_OIDC_ENABLED: 'true',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_TRANSACTION_SECRET:
        'google-oauth-transaction-production-secret-32-bytes',
      GOOGLE_REDIRECT_URI: 'https://app.example.test/evil',
    };
    expect(() =>
      loadAuthenticationConfig(invalidProductionEnvironment),
    ).toThrow();
  });
});
