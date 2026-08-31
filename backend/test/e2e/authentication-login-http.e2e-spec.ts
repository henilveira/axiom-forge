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

// Real HTTP password-login surface (AC-06): non-enumeration and rate limit.
describe('AUTH-001 real HTTP password login (development runtime, in-process)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await bootstrapAuthenticationTestApp();
  });

  afterEach(async () => {
    await shutdownAuthenticationTestApp(app);
  });

  it('rejects login with a non-existent account using the same generic error as a wrong password (AC-06 non-enumeration)', async () => {
    const unknownEmail = uniqueEmail();
    const unknown = await request(app.getHttpServer())
      .post('/auth/login/password')
      .send({ email: unknownEmail, password: 'irrelevant but 12+ chars' })
      .expect(401);
    expect(unknown.body).toEqual({ code: 'AUTH_FAILED' });
    expect(JSON.stringify(unknown.body)).not.toContain(unknownEmail);
    expect(unknown.headers['set-cookie']).toBeUndefined();

    const registeredEmail = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: registeredEmail,
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
      })
      .expect(201);
    // Registered but never verified: wrong-password and unverified-account
    // must be indistinguishable to the caller.
    const unverified = await request(app.getHttpServer())
      .post('/auth/login/password')
      .send({ email: registeredEmail, password: 'wrong password value' })
      .expect(401);
    expect(unverified.body).toEqual({ code: 'AUTH_FAILED' });
  });

  it('rate-limits repeated password login failures without permanently locking the account (AC-06)', async () => {
    const email = uniqueEmail();
    const attempts = await Promise.all(
      Array.from({ length: 5 }, async () =>
        request(app.getHttpServer())
          .post('/auth/login/password')
          .send({ email, password: 'wrong password value' })
          .then((response) => response.status),
      ),
    );
    expect(attempts.every((status) => status === 401)).toBe(true);

    const sixth = await request(app.getHttpServer())
      .post('/auth/login/password')
      .send({ email, password: 'wrong password value' });
    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual({ code: 'AUTH_RATE_LIMITED' });
  });

  function uniqueEmail(): string {
    return `auth001-http-e2e-${randomUUID()}@example.test`;
  }
});
