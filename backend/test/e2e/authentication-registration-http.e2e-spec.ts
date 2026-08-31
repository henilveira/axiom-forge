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

// Real HTTP registration + email verification surface (AC-01/AC-02/AC-03/
// AC-04). See test-kit/authentication-http-app.ts for the app boot strategy
// and the documented email-provider gap.
describe('AUTH-001 real HTTP registration (development runtime, in-process)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await bootstrapAuthenticationTestApp();
  });

  afterEach(async () => {
    await shutdownAuthenticationTestApp(app);
  });

  it('registers with a valid password and never leaks the credential or email back (AC-01)', async () => {
    const email = uniqueEmail();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
      })
      .expect(201);
    expect(response.body).toEqual({ outcome: 'ACCEPTED' });
    expect(JSON.stringify(response.body)).not.toContain(TEST_PASSWORD);
    expect(JSON.stringify(response.body)).not.toContain(email);
  });

  it('does not enumerate an existing account on duplicate registration (AC-02)', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
      })
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
      })
      .expect(201);
    expect(duplicate.body).toEqual({ outcome: 'ACCEPTED' });
  });

  it('rejects a password below the BR-02 minimum without creating a session (AC-03)', async () => {
    const email = uniqueEmail();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'too short', termsVersion: TEST_TERMS_VERSION })
      .expect(400);
    expect(response.body).toEqual({ code: 'AUTH_FAILED' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('never verifies an email with an invalid or tampered token (AC-04)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/email/verify')
      .query({ token: 'tampered-token-never-issued' })
      .expect(200);
    expect(response.body).toEqual({ outcome: 'REJECTED' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  function uniqueEmail(): string {
    return `auth001-http-e2e-${randomUUID()}@example.test`;
  }
});
