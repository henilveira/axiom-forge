import { Test, type TestingModule } from '@nestjs/testing';
import {
  AUTHENTICATION_RUNTIME,
  type AuthenticationRuntime,
} from '../../../src/modules/authentication/application/ports/authentication-runtime.port';
import { AuthenticationModule } from '../../../src/authentication.module';
import { authenticationContext } from '../../test-kit/authentication.builders';

describe('AUTH-001 test runtime e-mail provider regression', () => {
  const environmentKeys = [
    'NODE_ENV',
    'AUTH_FINGERPRINT_SECRET',
    'AUTH_EMAIL_VERIFICATION_TTL_MS',
    'AUTH_EMAIL_PROVIDER',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'AUTH_PUBLIC_BASE_URL',
  ] as const;

  it('uses the in-memory delivery when NODE_ENV=test and never invokes Resend (BR-03/BR-08)', async () => {
    const originalEnvironment = new Map(
      environmentKeys.map((key) => [key, process.env[key]]),
    );
    process.env['NODE_ENV'] = 'test';
    process.env['AUTH_FINGERPRINT_SECRET'] =
      'test-runtime-email-secret-with-32-bytes';
    process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'] = '600000';
    process.env['AUTH_EMAIL_PROVIDER'] = 'resend';
    delete process.env['RESEND_API_KEY'];
    delete process.env['EMAIL_FROM'];
    delete process.env['AUTH_PUBLIC_BASE_URL'];

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(
        new Error('real Resend must not be called in NODE_ENV=test'),
      );
    let moduleRef: TestingModule | null = null;
    try {
      moduleRef = await Test.createTestingModule({
        imports: [AuthenticationModule],
      }).compile();
      const runtime = moduleRef.get<AuthenticationRuntime>(
        AUTHENTICATION_RUNTIME,
      );
      await expect(
        runtime.register.execute({
          email: 'test-runtime@example.com',
          password: 'A sufficiently long password',
          termsVersion: 'v1',
          context: authenticationContext({
            correlationId: 'test-runtime-email-1',
          }),
        }),
      ).resolves.toEqual({ outcome: 'ACCEPTED' });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (moduleRef !== null) {
        await moduleRef.close();
      }
      fetchSpy.mockRestore();
      for (const [key, value] of originalEnvironment.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});

describe('AUTH-001 development runtime e-mail provider selection', () => {
  it('uses Resend only when explicitly opted in for development (BR-03)', async () => {
    const environmentKeys = [
      'NODE_ENV',
      'AUTH_FINGERPRINT_SECRET',
      'AUTH_EMAIL_VERIFICATION_TTL_MS',
      'AUTH_EMAIL_PROVIDER',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'AUTH_PUBLIC_BASE_URL',
      'JEST_WORKER_ID',
    ] as const;
    const originalEnvironment = new Map(
      environmentKeys.map((key) => [key, process.env[key]]),
    );
    process.env['NODE_ENV'] = 'development';
    process.env['AUTH_FINGERPRINT_SECRET'] =
      'development-runtime-email-secret-with-32-bytes';
    process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'] = '600000';
    process.env['AUTH_EMAIL_PROVIDER'] = 'resend';
    process.env['RESEND_API_KEY'] = 're_test_development_only';
    process.env['EMAIL_FROM'] = 'henrique@example.com';
    process.env['AUTH_PUBLIC_BASE_URL'] = 'http://localhost:3000';
    delete process.env['JEST_WORKER_ID'];

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));
    let moduleRef: TestingModule | null = null;
    try {
      moduleRef = await Test.createTestingModule({
        imports: [AuthenticationModule],
      }).compile();
      const runtime = moduleRef.get<AuthenticationRuntime>(
        AUTHENTICATION_RUNTIME,
      );
      await expect(
        runtime.register.execute({
          email: 'development-runtime@example.com',
          password: 'A sufficiently long password',
          termsVersion: 'v1',
          context: authenticationContext({
            correlationId: 'development-runtime-email-1',
          }),
        }),
      ).resolves.toEqual({ outcome: 'ACCEPTED' });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' }),
      );
    } finally {
      if (moduleRef !== null) {
        await moduleRef.close();
      }
      fetchSpy.mockRestore();
      for (const [key, value] of originalEnvironment.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});

describe('AUTH-001 Jest external e-mail barrier', () => {
  it('keeps development on InMemory when Jest sets development and Resend is opted in', async () => {
    const environmentKeys = [
      'NODE_ENV',
      'AUTH_FINGERPRINT_SECRET',
      'AUTH_EMAIL_VERIFICATION_TTL_MS',
      'AUTH_EMAIL_PROVIDER',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'AUTH_PUBLIC_BASE_URL',
      'JEST_WORKER_ID',
    ] as const;
    const originalEnvironment = new Map(
      environmentKeys.map((key) => [key, process.env[key]]),
    );
    process.env['NODE_ENV'] = 'development';
    process.env['AUTH_FINGERPRINT_SECRET'] =
      'jest-barrier-email-secret-with-32-bytes';
    process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'] = '600000';
    process.env['AUTH_EMAIL_PROVIDER'] = 'resend';
    process.env['RESEND_API_KEY'] = 're_test_jest_barrier';
    process.env['EMAIL_FROM'] = 'henrique@example.com';
    process.env['AUTH_PUBLIC_BASE_URL'] = 'http://localhost:3000';
    process.env['JEST_WORKER_ID'] = 't25-barrier';

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Resend must not be called from Jest'));
    let moduleRef: TestingModule | null = null;
    try {
      moduleRef = await Test.createTestingModule({
        imports: [AuthenticationModule],
      }).compile();
      const runtime = moduleRef.get<AuthenticationRuntime>(
        AUTHENTICATION_RUNTIME,
      );
      await expect(
        runtime.register.execute({
          email: 'jest-barrier@example.com',
          password: 'A sufficiently long password',
          termsVersion: 'v1',
          context: authenticationContext({
            correlationId: 'jest-barrier-email-1',
          }),
        }),
      ).resolves.toEqual({ outcome: 'ACCEPTED' });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (moduleRef !== null) {
        await moduleRef.close();
      }
      fetchSpy.mockRestore();
      for (const [key, value] of originalEnvironment.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
