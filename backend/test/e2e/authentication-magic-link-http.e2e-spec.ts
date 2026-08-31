import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  bootstrapAuthenticationTestApp,
  shutdownAuthenticationTestApp,
} from '../test-kit/authentication-http-app';
import {
  TEST_PASSWORD,
  TEST_TERMS_VERSION,
} from '../test-kit/authentication.constants';

// Real HTTP magic-link surface (AC-12/AC-14).
describe('AUTH-001 real HTTP magic link (development runtime, in-process)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await bootstrapAuthenticationTestApp();
  });

  afterEach(async () => {
    await shutdownAuthenticationTestApp(app);
  });

  it('accepts a magic-link request identically for unknown and known emails (AC-12 non-enumeration)', async () => {
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/magic-link/request')
      .send({ email: uniqueEmail() })
      .expect(201);
    expect(unknownResponse.body).toEqual({ outcome: 'ACCEPTED' });

    const registeredEmail = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: registeredEmail,
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
      })
      .expect(201);
    const knownResponse = await request(app.getHttpServer())
      .post('/auth/magic-link/request')
      .send({ email: registeredEmail })
      .expect(201);
    expect(knownResponse.body).toEqual({ outcome: 'ACCEPTED' });
  });

  it('never authenticates an invalid, tampered or unknown magic-link token (AC-14)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/magic-link/consume')
      .query({ token: 'never-issued-token' })
      .expect(401);
    expect(response.body).toEqual({ code: 'AUTH_FAILED' });
    expect(JSON.stringify(response.body)).not.toContain('never-issued-token');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  function uniqueEmail(): string {
    return `auth001-http-e2e-${randomUUID()}@example.test`;
  }
});
