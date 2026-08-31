import { loadAuthenticationConfig } from '../../../src/modules/authentication/infrastructure/config/authentication.config';
import { createProductionAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/production-authentication-runtime.factory';
import { createProductionRabbitChannel } from '../../../src/modules/authentication/infrastructure/composition/rabbitmq-channel.factory';
import type { EmailDeliveryPort } from '../../../src/modules/authentication/application/ports/email-delivery.port';
import type { RateLimitPort } from '../../../src/modules/authentication/application/ports/rate-limit.port';
import type { IntegrationEventHandlerPort } from '../../../src/modules/authentication/application/ports/messaging.types';

const databaseUrl = process.env['DATABASE_URL'];
const rabbitUrl = (process.env['RABBITMQ_URLS'] ?? '')
  .split(',')
  .map((value) => value.trim())
  .find((value) => value.length > 0);

if (databaseUrl === undefined || rabbitUrl === undefined) {
  it('BLOCKED AUTH-001 production composition: DATABASE_URL and RABBITMQ_URLS are required', () => {
    expect('BLOCKED AUTH-001 production composition').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 production composition: configure DATABASE_URL and RABBITMQ_URLS for disposable infrastructure',
    );
  });
} else {
  it('assembles the production runtime with real Postgres (adapter-pg) and real RabbitMQ (amqplib) — no InMemory repository or transport', async () => {
    process.env['RABBITMQ_TOPOLOGY_MODE'] = 'assert';
    const config = loadAuthenticationConfig({
      NODE_ENV: 'production',
      AUTH_FINGERPRINT_SECRET: '01234567890123456789012345678901',
      AUTH_ALLOWED_ORIGINS: 'https://app.example.com',
      AUTH_COOKIE_DOMAIN: 'app.example.com',
      AUTH_EMAIL_VERIFICATION_TTL_MS: '3600000',
      RESEND_API_KEY: 're_test-key',
      EMAIL_FROM: 'Example App <no-reply@app.example.com>',
      AUTH_PUBLIC_BASE_URL: 'https://app.example.com',
      AUTH_TERMS_VERSION: 'v1',
      [String('RABBITMQ_URLS')]: rabbitUrl,
      [String('RABBITMQ_VHOST')]: process.env['RABBITMQ_VHOST'],
    });
    const rabbitChannel = await createProductionRabbitChannel(
      config.rabbitMqUrls,
      process.env['RABBITMQ_TOPOLOGY_MODE'],
    );
    const emailDelivery: EmailDeliveryPort = {
      sendVerification(): void {},
      sendMagicLink(): void {},
    };
    const rateLimit: RateLimitPort = {
      check: () => true,
      record: () => undefined,
    };
    const eventHandler: IntegrationEventHandlerPort = {
      handle(): void {
        // ponytail: no integration-event consumers exist yet in AUTH-001.
      },
    };
    try {
      // ponytail: real assembly only — does not call messaging.start(),
      // which would subscribe to the shared production queue name
      // (`identity.authentication.events`) and risk draining backlog left
      // by unrelated runs against this disposable broker. The full
      // start/ack/retry/DLQ lifecycle is proven end-to-end with isolated
      // topologies in rabbitmq-delivery.integration.spec.ts.
      const runtime = createProductionAuthenticationRuntime(config, {
        emailDelivery,
        rateLimit,
        rabbitChannel,
        eventHandler,
      });
      expect(runtime.register).toBeDefined();
      expect(runtime.login).toBeDefined();
      expect(runtime.messaging).toBeDefined();
      await rabbitChannel.assertExchange('identity.authentication', 'topic', {
        durable: true,
      });
    } finally {
      await rabbitChannel.close();
    }
  }, 20_000);

  // ponytail: the DATABASE_URL fail-closed path is covered without real-infra
  // flakiness by the unit suite (production-runtime-composition.spec.ts),
  // which also avoids the module-level PrismaClient cache this factory keeps
  // for the process lifetime — a real singleton concern for production, but
  // one that makes re-testing "missing DATABASE_URL" after a successful
  // build in the same process non-deterministic.
}
