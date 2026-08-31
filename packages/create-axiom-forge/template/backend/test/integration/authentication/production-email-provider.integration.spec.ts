import { createProductionAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/production-authentication-runtime.factory';
import type { AuthenticationConfig } from '../../../src/modules/authentication/application/ports/authentication-config.port';
import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import type {
  IntegrationEventHandlerPort,
  RabbitConsumerChannelPort,
} from '../../../src/modules/authentication/application/ports/messaging.types';
import type { ProductionAuthenticationProviders } from '../../../src/modules/authentication/infrastructure/composition/production-authentication.types';
import {
  InMemoryInboxStore,
  InMemoryOutboxStore,
} from '../../../src/modules/authentication/infrastructure/messaging/inbox/in-memory-messaging.store';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { CapturingEmailSender } from '../../test-kit/authentication-email-fakes';
import { authenticationContext } from '../../test-kit/authentication.builders';

const config: AuthenticationConfig = {
  fingerprintSecret: 'auth-production-email-test-secret-32-bytes',
  allowedOrigins: new Set(['https://app.example.com']),
  cookieDomain: 'app.example.com',
  secureCookies: true,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 60 * 60 * 1_000,
  emailProvider: 'resend',
  resendApiKey: 're_test-never-used',
  resendEmailsReadApiKey: 're_test-never-used',
  emailFrom: 'Example App <no-reply@app.example.com>',
  authPublicBaseUrl: 'https://app.example.com',
  emailDiagnosticsEnabled: false,
  emailDiagnosticsSecret: '',
  rabbitMqUrls: ['amqp://localhost:5672'],
  googleEnabled: false,
  googleIssuer: 'https://accounts.google.com',
  googleClientId: '',
  googleClientSecret: '',
  googleOAuthTransactionSecret: 'google-oauth-transaction-test-secret-32-bytes',
  googleAuthorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenEndpoint: 'https://oauth2.googleapis.com/token',
  googleJwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  googleRedirectUri: 'https://app.example.com/auth/google/callback',
};

class FakeRabbitChannel implements RabbitConsumerChannelPort {
  public assertExchange(
    ...args: Parameters<RabbitConsumerChannelPort['assertExchange']>
  ): Promise<unknown> {
    return Promise.resolve(args.length);
  }

  public publishConfirmed(
    ...args: Parameters<RabbitConsumerChannelPort['publishConfirmed']>
  ): Promise<void> {
    if (args.length === 0) {
      throw new Error('fake channel requires publish arguments');
    }
    return Promise.resolve();
  }

  public assertQueue(
    ...args: Parameters<RabbitConsumerChannelPort['assertQueue']>
  ): Promise<unknown> {
    return Promise.resolve(args.length);
  }

  public bindQueue(
    ...args: Parameters<RabbitConsumerChannelPort['bindQueue']>
  ): Promise<unknown> {
    return Promise.resolve(args.length);
  }

  public prefetch(
    ...args: Parameters<RabbitConsumerChannelPort['prefetch']>
  ): Promise<void> {
    if (args.length === 0) {
      throw new Error('fake channel requires prefetch arguments');
    }
    return Promise.resolve();
  }

  public consume(
    ...args: Parameters<RabbitConsumerChannelPort['consume']>
  ): Promise<unknown> {
    return Promise.resolve(args.length);
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

const logger: AuthenticationLoggerPort = {
  info(): void {
    return undefined;
  },
  warn(): void {
    return undefined;
  },
};

const eventHandler: IntegrationEventHandlerPort = {
  handle(...args: Parameters<IntegrationEventHandlerPort['handle']>): void {
    if (args.length === 0) {
      throw new Error('fake handler requires an envelope');
    }
    return undefined;
  },
};

describe('AUTH-001 production e-mail provider composition', () => {
  const originalTopologyMode = process.env['RABBITMQ_TOPOLOGY_MODE'];

  afterEach(() => {
    if (originalTopologyMode === undefined) {
      delete process.env['RABBITMQ_TOPOLOGY_MODE'];
    } else {
      process.env['RABBITMQ_TOPOLOGY_MODE'] = originalTopologyMode;
    }
  });

  it('injects the generic sender into the productive composition and never calls Resend in the test (AC-01/BR-03)', async () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const sender = new CapturingEmailSender();
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(
        new Error('real Resend must not be called by this test'),
      );
    const providers: ProductionAuthenticationProviders = {
      repository: new InMemoryAuthenticationRepository(),
      emailSender: sender,
      inboxStore: new InMemoryInboxStore(),
      outboxStore: new InMemoryOutboxStore(),
      rabbitChannel: new FakeRabbitChannel(),
      eventHandler,
      logger,
      rateLimit: {
        check: () => true,
        record: () => undefined,
      },
    };

    try {
      const runtime = createProductionAuthenticationRuntime(config, providers);
      await expect(
        runtime.register.execute({
          email: 'person@example.com',
          password: 'A sufficiently long password',
          termsVersion: 'v1',
          context: authenticationContext({
            correlationId: 'production-email-1',
          }),
        }),
      ).resolves.toEqual({ outcome: 'ACCEPTED' });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(sender.messages).toHaveLength(1);
      expect(sender.messages[0]?.metadata).toEqual({
        category: 'EMAIL_VERIFICATION',
      });
      expect(sender.messages[0]?.to).toBe('person@example.com');
      expect(sender.messages[0]?.text).toContain(
        'https://app.example.com/auth/email/verify?token=',
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
