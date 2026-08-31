import { readBackendPort } from '../../src/infrastructure/config/backend.config';
import { loadAuthenticationConfig } from '../../src/modules/authentication/infrastructure/config/authentication.config';

describe('backend HTTP port configuration', () => {
  it('defaults the local backend to port 8080', () => {
    expect(readBackendPort({})).toBe(8080);
  });

  it('preserves an explicitly configured PORT override', () => {
    expect(readBackendPort({ PORT: '9090' })).toBe('9090');
  });

  it('uses the frontend origin for e-mail links while keeping the backend and Google callback separate', () => {
    const config = loadAuthenticationConfig({
      NODE_ENV: 'development',
      AUTH_FINGERPRINT_SECRET: '01234567890123456789012345678901',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
    });

    expect(config.authPublicBaseUrl).toBe('http://localhost:3000');
    expect(config.googleRedirectUri).toBe(
      'http://localhost:8080/auth/google/callback',
    );
    expect(config.allowedOrigins).toEqual(
      new Set([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
      ]),
    );
  });
});
