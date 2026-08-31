import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  AUTHENTICATION_RUNTIME,
  type AuthenticationRuntime,
} from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import {
  EMAIL_SENT_READER,
  type EmailSentReaderPort,
} from '../../src/modules/authentication/application/ports/email-reader.port';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import { createDevelopmentAuthenticationRuntime } from '../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import { EmailDiagnosticsController } from '../../src/modules/authentication/interfaces/http/email-diagnostics.controller';

const diagnosticSecret = 'diagnostic-contract-secret';
const config: AuthenticationConfig = {
  fingerprintSecret: 'email-diagnostics-contract-secret-with-32-bytes',
  allowedOrigins: new Set(['http://localhost:3000']),
  cookieDomain: 'localhost',
  secureCookies: false,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'henrique@example.com',
  authPublicBaseUrl: 'http://localhost:3000',
  emailDiagnosticsEnabled: true,
  emailDiagnosticsSecret: diagnosticSecret,
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

describe('GET /internal/auth/email/sent contract', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const runtime: AuthenticationRuntime =
      createDevelopmentAuthenticationRuntime(config);
    const sentList = {
      object: 'list' as const,
      hasMore: false,
      data: [
        {
          id: 'email-contract-01',
          to: ['person@example.com'],
          from: 'Example App <henrique@example.com>',
          createdAt: '2026-08-28T12:00:00.000Z',
          subject: 'Seu link de acesso à Example App',
          lastEvent: 'queued',
        },
      ],
    };
    const listSentEmails = jest.fn(() => Promise.resolve(sentList));
    const reader: EmailSentReaderPort = { listSentEmails };
    const moduleRef = await Test.createTestingModule({
      controllers: [EmailDiagnosticsController],
      providers: [
        { provide: AUTHENTICATION_RUNTIME, useValue: runtime },
        { provide: EMAIL_SENT_READER, useValue: reader },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a masked metadata-only page for an authorized loopback call', async () => {
    const response = await request(app.getHttpServer())
      .get('/internal/auth/email/sent')
      .set('x-auth-email-diagnostic-secret', diagnosticSecret)
      .query({ limit: 1 })
      .expect(200);

    expect(response.body).toEqual({
      object: 'list',
      hasMore: false,
      data: [
        {
          id: 'email-contract-01',
          to: ['p***@e***'],
          from: 'h***@e***',
          createdAt: '2026-08-28T12:00:00.000Z',
          subject: 'Seu link de acesso à Example App',
          lastEvent: 'queued',
        },
      ],
    });
  });

  it('does not reveal the internal route without its secret', async () => {
    await request(app.getHttpServer())
      .get('/internal/auth/email/sent')
      .expect(404, { code: 'NOT_FOUND' });
  });
});
