import {
  renderAuthenticationMagicLinkEmail,
  renderAuthenticationVerificationEmail,
} from '../../../src/modules/authentication/infrastructure/email/templates/auth-email.templates';
import { loadAuthenticationConfig } from '../../../src/modules/authentication/infrastructure/config/authentication.config';

const expiresAt = new Date('2026-08-28T12:00:00.000Z');
const sharedInput = {
  email: 'person@example.com',
  token: 'token<&"\'',
  expiresAt,
  from: 'Example App <no-reply@example.com>',
  publicBaseUrl: 'https://api.example.com',
};

describe('authentication e-mail templates', () => {
  it('renders a server-derived verification link with escaped HTML', () => {
    const message = renderAuthenticationVerificationEmail(sharedInput);

    expect(message.subject).toContain('Confirme');
    expect(message.metadata).toEqual({ category: 'EMAIL_VERIFICATION' });
    expect(message.text).toContain(
      'https://api.example.com/auth/email/verify?token=token%3C%26%22%27',
    );
    expect(message.html).toContain(
      'https://api.example.com/auth/email/verify?token=token%3C%26%22%27',
    );
    expect(message.html).not.toContain('<&"\'');
    expect(Object.isFrozen(message)).toBe(true);
  });

  it('renders a distinct magic-link route and category', () => {
    const message = renderAuthenticationMagicLinkEmail(sharedInput);

    expect(message.subject).toContain('acesso');
    expect(message.metadata).toEqual({ category: 'MAGIC_LOGIN' });
    expect(message.text).toContain(
      'https://api.example.com/auth/magic-link/consume?token=token%3C%26%22%27',
    );
  });

  it('renders local magic-link e-mails through the frontend rewrite origin', () => {
    const config = loadAuthenticationConfig({
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: '01234567890123456789012345678901',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '600000',
    });
    const message = renderAuthenticationMagicLinkEmail({
      ...sharedInput,
      publicBaseUrl: config.authPublicBaseUrl,
    });
    const link = new URL(message.text?.split('\n')[3] ?? '');

    expect(link.origin).toBe('http://localhost:3000');
    expect(link.pathname).toBe('/auth/magic-link/consume');
    expect(message.html).toContain(
      'http://localhost:3000/auth/magic-link/consume?token=',
    );
  });

  it('rejects public bases with credentials, query, or a path', () => {
    expect(() =>
      renderAuthenticationVerificationEmail({
        ...sharedInput,
        publicBaseUrl: 'https://attacker.example/?next=https://safe.example',
      }),
    ).toThrow('AUTH_PUBLIC_BASE_URL');
    expect(() =>
      renderAuthenticationVerificationEmail({
        ...sharedInput,
        publicBaseUrl: 'https://attacker.example/auth',
      }),
    ).toThrow('AUTH_PUBLIC_BASE_URL');
  });
});
