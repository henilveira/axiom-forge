import type { AuthenticationRuntime } from '../../../src/modules/authentication/application/ports/authentication-runtime.port';
import type {
  EmailSentReaderPort,
  SentEmailList,
} from '../../../src/modules/authentication/application/ports/email-reader.port';
import { createDevelopmentAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import { EmailDiagnosticsController } from '../../../src/modules/authentication/interfaces/http/email-diagnostics.controller';
import type {
  HttpRequestLike,
  HttpResponseLike,
} from '../../../src/modules/authentication/interfaces/http/http.types';
import type { AuthenticationConfig } from '../../../src/modules/authentication/application/ports/authentication-config.port';

const config: AuthenticationConfig = {
  fingerprintSecret: 'email-diagnostics-test-secret-with-32-bytes',
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
  emailDiagnosticsSecret: 'diagnostic-secret-with-enough-length',
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

const sentEmails: SentEmailList = {
  object: 'list',
  hasMore: false,
  data: [
    {
      id: 'email-01',
      to: ['person@example.com'],
      from: 'henrique@example.com',
      createdAt: '2026-08-28T12:00:00.000Z',
      subject: 'Seu link de acesso à Example App',
      lastEvent: 'queued',
    },
  ],
};

describe('EmailDiagnosticsController', () => {
  it('returns the sanitized Resend list for an authorized loopback request', async () => {
    const listSentEmails = jest.fn(() => Promise.resolve(sentEmails));
    const reader: EmailSentReaderPort = {
      listSentEmails,
    };
    const controller = createController(reader);
    const response = new CapturingResponse();

    await controller.listSentEmails(
      { limit: '1', after: 'cursor-01' },
      authorizedRequest(),
      response,
    );

    expect(response.statusValue).toBe(200);
    expect(response.jsonValue).toEqual({
      ...sentEmails,
      data: [
        {
          ...sentEmails.data[0],
          to: ['p***@e***'],
          from: 'h***@e***',
          subject: 'Seu link de acesso à Example App',
        },
      ],
    });
    expect(listSentEmails).toHaveBeenCalledWith({
      limit: 1,
      after: 'cursor-01',
    });
  });

  it('builds an explicit response and redacts unknown sensitive subjects', async () => {
    const listSentEmails = jest.fn(() =>
      Promise.resolve({
        ...sentEmails,
        data: [
          {
            ...sentEmails.data[0],
            subject: 'Token opaque-123 para person@example.com',
            body: 'private body',
            headers: { authorization: 'private header' },
            token: 'opaque-123',
          },
        ],
      }),
    );
    const controller = createController({ listSentEmails });
    const response = new CapturingResponse();

    await controller.listSentEmails({}, authorizedRequest(), response);

    expect(response.jsonValue).toEqual({
      object: 'list',
      hasMore: false,
      data: [
        {
          id: 'email-01',
          to: ['p***@e***'],
          from: 'h***@e***',
          createdAt: '2026-08-28T12:00:00.000Z',
          subject: '[redacted]',
          lastEvent: 'queued',
        },
      ],
    });
    expect(JSON.stringify(response.jsonValue)).not.toContain('opaque-123');
    expect(JSON.stringify(response.jsonValue)).not.toContain('private body');
  });

  it.each([
    ['missing secret', { 'x-auth-email-diagnostic-secret': '' }],
    ['wrong secret', { 'x-auth-email-diagnostic-secret': 'wrong' }],
    ['remote address', { ip: 'not-loopback' }],
    ['non-local origin', { origin: 'https://app.example.com' }],
  ])(
    'returns 404 for %s without invoking the reader',
    async (_name, override) => {
      const listSentEmails = jest.fn(() => Promise.resolve(sentEmails));
      const reader: EmailSentReaderPort = {
        listSentEmails,
      };
      const controller = createController(reader);
      const response = new CapturingResponse();
      const request = authorizedRequest(override);

      await controller.listSentEmails({}, request, response);

      expect(response.statusValue).toBe(404);
      expect(response.jsonValue).toEqual({ code: 'NOT_FOUND' });
      expect(listSentEmails).not.toHaveBeenCalled();
    },
  );

  it('returns a generic 503 when the provider reader fails', async () => {
    const listSentEmails = jest.fn(() =>
      Promise.reject(new Error('provider secret')),
    );
    const reader: EmailSentReaderPort = {
      listSentEmails,
    };
    const controller = createController(reader);
    const response = new CapturingResponse();

    await controller.listSentEmails({}, authorizedRequest(), response);

    expect(response.statusValue).toBe(503);
    expect(response.jsonValue).toEqual({
      code: 'EMAIL_DIAGNOSTICS_UNAVAILABLE',
    });
    expect(JSON.stringify(response.jsonValue)).not.toContain('provider secret');
  });

  it('rejects invalid pagination with a TypeError after authorization', async () => {
    const listSentEmails = jest.fn(() => Promise.resolve(sentEmails));
    const reader: EmailSentReaderPort = {
      listSentEmails,
    };
    const controller = createController(reader);

    await expect(
      controller.listSentEmails(
        { limit: '101' },
        authorizedRequest(),
        new CapturingResponse(),
      ),
    ).rejects.toThrow('email-diagnostics-limit-invalid');
    expect(listSentEmails).not.toHaveBeenCalled();
  });
});

function createController(
  reader: EmailSentReaderPort,
): EmailDiagnosticsController {
  const runtime: AuthenticationRuntime =
    createDevelopmentAuthenticationRuntime(config);
  return new EmailDiagnosticsController(runtime, reader);
}

function authorizedRequest(
  override: Readonly<{
    readonly ip?: string;
    readonly origin?: string;
    readonly 'x-auth-email-diagnostic-secret'?: string;
  }> = {},
): HttpRequestLike {
  return {
    ip: override.ip ?? '127.0.0.1',
    headers: {
      origin: override.origin,
      'x-auth-email-diagnostic-secret':
        override['x-auth-email-diagnostic-secret'] ??
        config.emailDiagnosticsSecret,
    },
  };
}

class CapturingResponse implements HttpResponseLike {
  public statusValue = 200;
  public jsonValue: unknown = undefined;

  public cookie(): void {}

  public clearCookie(): void {}

  public setHeader(): void {}

  public redirect(): void {}

  public status(status: number): HttpResponseLike {
    this.statusValue = status;
    return this;
  }

  public json(body: unknown): void {
    this.jsonValue = body;
  }
}
