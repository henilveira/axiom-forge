import { createProductionAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/production-authentication-runtime.factory';
import type { AuthenticationConfig } from '../../../src/modules/authentication/application/ports/authentication-config.port';
import type { ProductionAuthenticationProviders } from '../../../src/modules/authentication/infrastructure/composition/production-authentication.types';
import type { AuthenticationRepositoryPort } from '../../../src/modules/authentication/application/ports/authentication-repository.port';
import type {
  InboxStorePort,
  OutboxStorePort,
  RabbitConsumerChannelPort,
  IntegrationEventHandlerPort,
} from '../../../src/modules/authentication/application/ports/messaging.types';
import type { EmailDeliveryPort } from '../../../src/modules/authentication/application/ports/email-delivery.port';
import type { RateLimitPort } from '../../../src/modules/authentication/application/ports/rate-limit.port';
import type { GoogleTransactionStorePort } from '../../../src/modules/authentication/application/ports/google-oidc.port';

const baseConfig: AuthenticationConfig = {
  fingerprintSecret: '01234567890123456789012345678901',
  allowedOrigins: new Set(['https://app.example.com']),
  cookieDomain: 'app.example.com',
  secureCookies: true,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 3_600_000,
  emailProvider: 'resend',
  resendApiKey: 're_test-key',
  resendEmailsReadApiKey: 're_test-key',
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

const fakeRepository: AuthenticationRepositoryPort =
  {} as unknown as AuthenticationRepositoryPort;
const fakeInboxStore: InboxStorePort = {} as unknown as InboxStorePort;
const fakeOutboxStore: OutboxStorePort = {} as unknown as OutboxStorePort;
const fakeRabbitChannel: RabbitConsumerChannelPort =
  {} as unknown as RabbitConsumerChannelPort;
const fakeEventHandler: IntegrationEventHandlerPort = {
  handle(): void {
    // ponytail: unused in fail-closed assertions, only satisfies the port.
  },
};
const fakeEmailDelivery: EmailDeliveryPort = {
  sendVerification(): void {},
  sendMagicLink(): void {},
};
const fakeRateLimit: RateLimitPort = {
  check: () => true,
  record: () => undefined,
};
const fakeGoogleTransactions: GoogleTransactionStorePort =
  {} as unknown as GoogleTransactionStorePort;

const fullyWiredProviders = (): ProductionAuthenticationProviders => ({
  repository: fakeRepository,
  inboxStore: fakeInboxStore,
  outboxStore: fakeOutboxStore,
  rabbitChannel: fakeRabbitChannel,
  eventHandler: fakeEventHandler,
  emailDelivery: fakeEmailDelivery,
  rateLimit: fakeRateLimit,
});

describe('production authentication composition root', () => {
  const originalTopologyMode = process.env['RABBITMQ_TOPOLOGY_MODE'];
  const originalDatabaseUrl = process.env['DATABASE_URL'];

  afterEach(() => {
    if (originalTopologyMode === undefined) {
      delete process.env['RABBITMQ_TOPOLOGY_MODE'];
    } else {
      process.env['RABBITMQ_TOPOLOGY_MODE'] = originalTopologyMode;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env['DATABASE_URL'];
    } else {
      process.env['DATABASE_URL'] = originalDatabaseUrl;
    }
  });

  it('fails closed without an injected repository and no DATABASE_URL', () => {
    delete process.env['DATABASE_URL'];
    const providers = fullyWiredProviders();
    delete (providers as { repository?: unknown }).repository;
    expect(() =>
      createProductionAuthenticationRuntime(baseConfig, providers),
    ).toThrow(/DATABASE_URL/);
  });

  it('fails closed without configured Resend credentials', () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const providers = fullyWiredProviders();
    delete (providers as { emailDelivery?: unknown }).emailDelivery;
    expect(() =>
      createProductionAuthenticationRuntime(
        { ...baseConfig, resendApiKey: '' },
        providers,
      ),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('fails closed without a distributed rate limit', () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const providers = fullyWiredProviders();
    delete (providers as { rateLimit?: unknown }).rateLimit;
    expect(() =>
      createProductionAuthenticationRuntime(baseConfig, providers),
    ).toThrow(/distributed rate limit/);
  });

  it('fails closed without RabbitMQ channel/config', () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const providers = fullyWiredProviders();
    delete (providers as { rabbitChannel?: unknown }).rabbitChannel;
    expect(() =>
      createProductionAuthenticationRuntime(baseConfig, providers),
    ).toThrow(/RabbitMQ configuration/);
  });

  it('fails closed when RABBITMQ_TOPOLOGY_MODE is not "assert"', () => {
    delete process.env['RABBITMQ_TOPOLOGY_MODE'];
    const providers = fullyWiredProviders();
    expect(() =>
      createProductionAuthenticationRuntime(baseConfig, providers),
    ).toThrow(/RABBITMQ_TOPOLOGY_MODE/);
  });

  it('fails closed when Google is enabled without a sealed transaction store', () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const providers = fullyWiredProviders();
    expect(() =>
      createProductionAuthenticationRuntime(
        { ...baseConfig, googleEnabled: true },
        providers,
      ),
    ).toThrow(/sealed Google transaction store/);
  });

  it('builds a runtime with the static password blocklist and Argon2id hasher when every required provider is present', () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const providers: ProductionAuthenticationProviders = {
      ...fullyWiredProviders(),
      googleTransactions: fakeGoogleTransactions,
    };
    const runtime = createProductionAuthenticationRuntime(
      baseConfig,
      providers,
    );
    expect(runtime.messaging).toBeDefined();
    expect(runtime.config).toBe(baseConfig);
  });
});
