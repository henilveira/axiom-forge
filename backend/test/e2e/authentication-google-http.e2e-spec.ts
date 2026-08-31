import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  bootstrapAuthenticationTestApp,
  shutdownAuthenticationTestApp,
} from '../test-kit/authentication-http-app';

// Real HTTP Google OAuth surface with Google disabled by default (AC-07
// documented as disabled, AC-08 error path). GOOGLE_OIDC_ENABLED is not set
// in this environment, so config.googleEnabled === false — no real Google
// credentials are simulated.
describe('AUTH-001 real HTTP Google OAuth, disabled by default (development runtime, in-process)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await bootstrapAuthenticationTestApp();
  });

  afterEach(async () => {
    await shutdownAuthenticationTestApp(app);
  });

  it('keeps Google sign-in unavailable while disabled by default, without leaking configuration (AC-07)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/google/start')
      .expect(401);
    expect(response.body).toEqual({ code: 'AUTH_GOOGLE_UNAVAILABLE' });
  });

  it('rejects a Google callback with an invalid/mismatched state without leaking the code or state (AC-08 error path)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'invalid-code', state: 'invalid-state' })
      .expect(400);
    expect(response.body).toEqual({ code: 'AUTH_FAILED' });
    expect(JSON.stringify(response.body)).not.toContain('invalid-code');
    expect(JSON.stringify(response.body)).not.toContain('invalid-state');
  });
});
