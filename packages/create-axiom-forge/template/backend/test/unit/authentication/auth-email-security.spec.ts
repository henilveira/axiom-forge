import {
  renderAuthenticationMagicLinkEmail,
  renderAuthenticationVerificationEmail,
} from '../../../src/modules/authentication/infrastructure/email/templates/auth-email.templates';
import { loadAuthenticationConfig } from '../../../src/modules/authentication/infrastructure/config/authentication.config';
import { sanitizeLifecycleRecord } from '../../../src/modules/authentication/infrastructure/messaging/observability/messaging.logger';

const expiresAt = new Date('2026-08-28T12:00:00.000Z');
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
};

describe('authentication e-mail security boundaries', () => {
  it('URL-encodes tokens and HTML-escapes interpolated values in both auth templates (AC-04/13/14)', () => {
    const token = `raw<&"' token?=+/#`;
    const email = 'person<&"\'@example.com';
    const input = {
      email,
      token,
      expiresAt,
      from: 'Example App <no-reply@example.com>',
      publicBaseUrl: 'https://api.example.com',
    };

    const verification = renderAuthenticationVerificationEmail(input);
    const magic = renderAuthenticationMagicLinkEmail(input);
    const verificationLink = verification.text?.split('\n')[3];
    const magicLink = magic.text?.split('\n')[3];

    expect(verificationLink).toBeDefined();
    expect(magicLink).toBeDefined();
    expect(new URL(verificationLink ?? '').searchParams.get('token')).toBe(
      token,
    );
    expect(new URL(magicLink ?? '').searchParams.get('token')).toBe(token);
    expect(verification.html).toContain(
      'person&lt;&amp;&quot;&#39;@example.com',
    );
    expect(verification.html).not.toContain(email);
    expect(magic.html).not.toContain(token);
    expect(verification.html).not.toContain(token);
    expect(verification.metadata).toEqual({ category: 'EMAIL_VERIFICATION' });
    expect(magic.metadata).toEqual({ category: 'MAGIC_LOGIN' });
  });

  it.each([
    ['missing API key', { RESEND_API_KEY: undefined }, 'RESEND_API_KEY'],
    ['blank sender', { EMAIL_FROM: ' ' }, 'EMAIL_FROM'],
    [
      'invalid sender mailbox',
      { EMAIL_FROM: 'Example App <not-an-email>' },
      'EMAIL_FROM',
    ],
    [
      'header injection in sender',
      {
        EMAIL_FROM:
          'Example App <no-reply@app.example.com>\r\nBcc:evil@example.com',
      },
      'EMAIL_FROM',
    ],
    [
      'missing public base',
      { AUTH_PUBLIC_BASE_URL: undefined },
      'AUTH_PUBLIC_BASE_URL',
    ],
    [
      'non-HTTPS public base in production',
      { AUTH_PUBLIC_BASE_URL: 'http://app.example.com' },
      'AUTH_PUBLIC_BASE_URL',
    ],
    [
      'public base with credentials',
      { AUTH_PUBLIC_BASE_URL: 'https://user:pass@app.example.com' },
      'AUTH_PUBLIC_BASE_URL',
    ],
    [
      'public base with path',
      { AUTH_PUBLIC_BASE_URL: 'https://app.example.com/auth' },
      'AUTH_PUBLIC_BASE_URL',
    ],
  ])('fails closed for %s', (_caseName, override, expectedMessage) => {
    const environment = { ...productionEnvironment, ...override };
    expect(() => loadAuthenticationConfig(environment)).toThrow(
      expectedMessage,
    );
  });

  it('keeps raw e-mail and token out of lifecycle logs (BR-10)', () => {
    const rawEmail = 'person@example.com';
    const rawToken = 'magic-token-that-must-not-be-logged';
    const record = sanitizeLifecycleRecord('processed', {
      eventId: 'event-1',
      messageId: 'message-1',
      correlationId: 'correlation-1',
      tenantId: null,
      attempt: 1,
      outcome: 'success',
      durationMs: 1,
      occurredAt: expiresAt.toISOString(),
      recordedAt: expiresAt.toISOString(),
      email: rawEmail,
      token: rawToken,
      errorCode: 'PROVIDER_UNAVAILABLE',
    });

    expect(JSON.stringify(record)).not.toContain(rawEmail);
    expect(JSON.stringify(record)).not.toContain(rawToken);
    expect(record).toMatchObject({
      event: 'processed',
      outcome: 'success',
      errorCode: 'PROVIDER_UNAVAILABLE',
    });
  });
});
