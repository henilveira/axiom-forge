import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import type {
  IntegrationEventEnvelope,
  RabbitTopology,
} from '../../../src/modules/authentication/application/ports/messaging.types';
import { InboxEventProcessor } from '../../../src/modules/authentication/infrastructure/messaging/inbox/inbox-event.processor';
import { PrismaInboxStore } from '../../../src/modules/authentication/infrastructure/messaging/inbox/prisma-inbox.store';
import {
  AuthenticationRabbitConsumer,
  RabbitConsumerControlAdapter,
} from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/inbox-consumer.adapter';
import { RabbitConfirmPublisher } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbit.publisher';
import { AmqplibRabbitChannel } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/amqplib-channel.adapter';
import { parseRabbitMqUrls } from '../../../src/modules/authentication/infrastructure/config/rabbitmq.config';
import {
  cleanupIsolatedRabbitTopology,
  createIsolatedRabbitTopology,
} from '../../test-kit/rabbitmq-test-topology';
import {
  TEST_CORRELATION_ID,
  TEST_RABBIT_TIMEOUT_MS,
} from '../../test-kit/authentication.constants';

// Real RabbitMQ delivery + real PostgreSQL inbox: proves exactly-once
// processing (AC-20) beyond the InMemory-inbox dedup already exercised by
// rabbitmq-delivery.integration.spec.ts, including a genuine PostgreSQL CAS
// race between two concurrent consumers for a brand-new event id.
const rabbitUrl = parseRabbitMqUrls(process.env)[0];
const databaseUrl = process.env['DATABASE_URL'];

class SilentLogger implements AuthenticationLoggerPort {
  public readonly events: string[] = [];

  public info(event: string): void {
    this.events.push(event);
  }

  public warn(event: string): void {
    this.events.push(event);
  }
}

if (rabbitUrl === undefined || databaseUrl === undefined) {
  it('BLOCKED AUTH-001 RabbitMQ+PostgreSQL: RABBITMQ_URLS and DATABASE_URL are required', () => {
    expect('BLOCKED AUTH-001 RabbitMQ+PostgreSQL').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 RabbitMQ+PostgreSQL: configure RABBITMQ_URLS and DATABASE_URL for durable inbox coverage',
    );
  });
} else {
  it(
    'proves durable inbox idempotency against real PostgreSQL for a real RabbitMQ delivery (AC-20 exactly-once)',
    async () => {
      const prisma: PrismaClient = createProductionPrismaClient(databaseUrl);
      await prisma.$connect();
      const inbox = new PrismaInboxStore(prisma);
      const topology = testTopology();
      const publisherChannel = await AmqplibRabbitChannel.connect(rabbitUrl);
      const consumerChannel = await AmqplibRabbitChannel.connect(rabbitUrl);
      const consumerName = `auth001-durable-inbox-${randomUUID()}`;
      const envelope = validEnvelope();
      try {
        const { logger, handled, processed } = await wireConsumer(
          inbox,
          consumerChannel,
          topology,
          consumerName,
        );
        const publisher = new RabbitConfirmPublisher(
          publisherChannel,
          topology,
        );
        await publisher.publish(envelope, topology.bindingKey);
        await expect(withTimeout(processed)).resolves.toBeUndefined();
        expect(handled).toHaveLength(1);

        const stored = await prisma.inboxMessage.findUnique({
          where: {
            consumerName_eventId: { consumerName, eventId: envelope.eventId },
          },
        });
        expect(stored?.status).toBe('PROCESSED');
        expect(stored?.processedAt).not.toBeNull();

        // Real RabbitMQ redelivery of the exact same event must be rejected
        // by PostgreSQL's unique (consumerName, eventId) CAS.
        await publisher.publish(envelope, topology.bindingKey);
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
        expect(handled).toHaveLength(1);
        expect(logger.events).toContain('duplicate');

        await assertOnlyOneWinner(inbox, consumerName);
        const redelivered = await inbox.acquire({
          consumerName,
          eventId: envelope.eventId,
          messageId: randomUUID(),
          receivedAt: new Date(),
          owner: 'racer-c',
        });
        expect(redelivered.outcome).toBe('DUPLICATE');
      } finally {
        await consumerChannel.close();
        await publisherChannel.close();
        await cleanupIsolatedRabbitTopology(rabbitUrl, topology);
        await prisma.inboxMessage.deleteMany({ where: { consumerName } });
        await prisma.$disconnect();
      }
    },
    TEST_RABBIT_TIMEOUT_MS * 2,
  );

  async function wireConsumer(
    inbox: PrismaInboxStore,
    consumerChannel: AmqplibRabbitChannel,
    topology: RabbitTopology,
    consumerName: string,
  ): Promise<{
    logger: SilentLogger;
    handled: IntegrationEventEnvelope[];
    processed: Promise<void>;
  }> {
    const logger = new SilentLogger();
    const handled: IntegrationEventEnvelope[] = [];
    let signal: (() => void) | undefined;
    const processed = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const processor = new InboxEventProcessor(
      inbox,
      {
        handle(delivered: IntegrationEventEnvelope): void {
          handled.push(delivered);
          signal?.();
        },
      },
      logger,
      {
        consumerName,
        exchange: topology.exchange,
        routingKey: topology.bindingKey,
      },
    );
    const control = new RabbitConsumerControlAdapter({
      channel: consumerChannel,
      topology,
    });
    await new AuthenticationRabbitConsumer(
      consumerChannel,
      processor,
      control,
      topology,
    ).start();
    return { logger, handled, processed };
  }

  async function assertOnlyOneWinner(
    inbox: PrismaInboxStore,
    consumerName: string,
  ): Promise<void> {
    const freshEventId = randomUUID();
    const raceAcquire = await Promise.all([
      inbox.acquire({
        consumerName,
        eventId: freshEventId,
        messageId: randomUUID(),
        receivedAt: new Date(),
        owner: 'racer-a',
      }),
      inbox.acquire({
        consumerName,
        eventId: freshEventId,
        messageId: randomUUID(),
        receivedAt: new Date(),
        owner: 'racer-b',
      }),
    ]);
    expect(
      raceAcquire.filter((result) => result.outcome === 'ACQUIRED'),
    ).toHaveLength(1);
    expect(
      raceAcquire.filter((result) => result.outcome === 'DUPLICATE'),
    ).toHaveLength(1);
  }

  function withTimeout(processed: Promise<void>): Promise<void> {
    return Promise.race([
      processed,
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error('RabbitMQ processing timeout')),
          TEST_RABBIT_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  function testTopology(): RabbitTopology {
    return createIsolatedRabbitTopology();
  }
}

function validEnvelope(): IntegrationEventEnvelope {
  const id = randomUUID();
  return {
    messageId: id,
    eventId: randomUUID(),
    eventType: 'identity.authentication.EmailVerified.v1',
    eventVersion: 1,
    schemaVersion: 1,
    occurredAt: new Date().toISOString(),
    producer: 'backend.identity',
    correlationId: TEST_CORRELATION_ID,
    causationId: null,
    tenantId: null,
    data: {
      type: 'EmailVerified',
      userId: id,
      occurredAt: new Date().toISOString(),
    },
  };
}
