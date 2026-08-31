import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  bootstrapAuthenticationTestApp,
  shutdownAuthenticationTestApp,
} from '../test-kit/authentication-http-app';

// Real HTTP CSRF surface (AC-18).
describe('AUTH-001 real HTTP CSRF protection (development runtime, in-process)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await bootstrapAuthenticationTestApp();
  });

  afterEach(async () => {
    await shutdownAuthenticationTestApp(app);
  });

  it('rejects session refresh and logout without any CSRF proof (AC-18)', async () => {
    const refresh = await request(app.getHttpServer())
      .post('/auth/session/refresh')
      .expect(401);
    expect(refresh.body).toEqual({ code: 'AUTH_CSRF_REJECTED' });

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(401);
    expect(logout.body).toEqual({ code: 'AUTH_CSRF_REJECTED' });
  });

  it(
    'accepts a matching double-submit CSRF cookie + header once cookies are parsed, ' +
      'and fails downstream on the (unrelated) invalid refresh token instead of on CSRF (AC-18)',
    async () => {
      // Regression coverage for AUTH-BE-T03-FIX-P1: `cookie-parser` is now
      // registered globally (`AppModule#configure`), so
      // `AuthenticationCookiePolicy` reads real cookies and
      // `DoubleSubmitCsrfAdapter.validate()` receives the actual
      // `cookieToken`. A matching CSRF cookie/header pair with an allowed
      // origin therefore clears CSRF validation; the request then fails for
      // an unrelated reason (the refresh token value is not a real session),
      // proving the fix end-to-end without depending on session fixtures.
      const csrfToken = randomUUID();
      const origin = 'http://localhost:3000';
      const response = await request(app.getHttpServer())
        .post('/auth/session/refresh')
        .set('Cookie', [
          `app_csrf=${csrfToken}`,
          'app_refresh=not-a-real-refresh-token',
        ])
        .set('Origin', origin)
        .set('x-csrf-token', csrfToken);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: 'AUTH_FAILED' });
    },
  );
});
