import { randomUUID } from 'node:crypto';
import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import type {
  IntegrationEventEnvelope,
  RabbitDelivery,
} from '../../../src/modules/authentication/application/ports/messaging.types';
import { InboxEventProcessor } from '../../../src/modules/authentication/infrastructure/messaging/inbox/inbox-event.processor';
import { InMemoryInboxStore } from '../../../src/modules/authentication/infrastructure/messaging/inbox/in-memory-messaging.store';
import {
  AuthenticationRabbitConsumer,
  RabbitConsumerControlAdapter,
} from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/inbox-consumer.adapter';
import { declareAuthenticationTopology } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbitmq-topology';
import { RabbitConfirmPublisher } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbit.publisher';
import type { RabbitTopology } from '../../../src/modules/authentication/application/ports/messaging.types';
import { AmqplibRabbitChannel } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/amqplib-channel.adapter';
import { parseRabbitMqUrls } from '../../../src/modules/authentication/infrastructure/config/rabbitmq.config';
import {
  cleanupIsolatedRabbitTopology,
  createIsolatedRabbitTopology,
} from '../../test-kit/rabbitmq-test-topology';
import {
  TEST_CORRELATION_ID,
  TEST_RABBIT_RETRY_DELAY_MS,
  TEST_RABBIT_TIMEOUT_MS,
} from '../../test-kit/authentication.constants';

const rabbitUrl = parseRabbitMqUrls(process.env)[0];

class SilentLogger implements AuthenticationLoggerPort {
  public readonly events: string[] = [];

  public info(event: string): void {
    this.events.push(event);
  }

  public warn(event: string): void {
    this.events.push(event);
  }
}

if (rabbitUrl === undefined) {
  it('BLOCKED AUTH-001 RabbitMQ: RABBITMQ_URLS is required', () => {
    expect('BLOCKED AUTH-001 RabbitMQ').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 RabbitMQ: configure RABBITMQ_URLS for disposable RabbitMQ integration',
    );
  });
} else {
  it(
    'declares topology, confirms mandatory publish and acks only after processing',
    async () => {
      const topology = testTopology();
      const publisherChannel = await connectRabbit();
      const consumerChannel = await connectRabbit();
      try {
        const logger = new SilentLogger();
        const inbox = new InMemoryInboxStore();
        const handled: IntegrationEventEnvelope[] = [];
        let signal: (() => void) | undefined;
        const processed = new Promise<void>((resolve) => {
          signal = resolve;
        });
        const processor = new InboxEventProcessor(
          inbox,
          {
            handle(envelope: IntegrationEventEnvelope): void {
              handled.push(envelope);
              signal?.();
            },
          },
          logger,
          {
            consumerName: 'auth001-rabbit-consumer',
            exchange: topology.exchange,
            routingKey: topology.bindingKey,
          },
        );
        const control = new RabbitConsumerControlAdapter({
          channel: consumerChannel,
          topology,
        });
        const consumer = new AuthenticationRabbitConsumer(
          consumerChannel,
          processor,
          control,
          topology,
        );
        await consumer.start();

        const publisher = new RabbitConfirmPublisher(
          publisherChannel,
          topology,
        );
        const envelope = validEnvelope();
        await publisher.publish(envelope, topology.bindingKey);
        await expect(
          Promise.race([
            processed,
            new Promise<void>((_, reject) =>
              setTimeout(
                () => reject(new Error('RabbitMQ processing timeout')),
                TEST_RABBIT_TIMEOUT_MS,
              ),
            ),
          ]),
        ).resolves.toBeUndefined();
        expect(handled).toHaveLength(1);
        expect(logger.events).toEqual(['received', 'stored', 'processed']);

        await publisher.publish(envelope, topology.bindingKey);
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
        expect(handled).toHaveLength(1);
        expect(logger.events).toContain('duplicate');
        await expect(
          publisher.publish(envelope, 'unbound.routing.key'),
        ).rejects.toThrow('unroutable');
      } finally {
        await consumerChannel.close();
        await publisherChannel.close();
        await cleanupIsolatedRabbitTopology(rabbitUrl, topology);
      }
    },
    TEST_RABBIT_TIMEOUT_MS * 2,
  );

  it(
    'moves a real delivery to DLQ and replays it through the source exchange',
    async () => {
      const topology = testTopology();
      const channel = await connectRabbit();
      try {
        await declareAuthenticationTopology(channel, topology);
        const control = new RabbitConsumerControlAdapter({ channel, topology });
        const publisher = new RabbitConfirmPublisher(channel, topology);
        const envelope = validEnvelope();
        await publisher.publish(envelope, topology.bindingKey);
        const delivery = await channel.get(topology.queue);
        if (delivery === null) {
          throw new Error('RabbitMQ test delivery was not available');
        }
        await control.deadLetter(delivery, 'SCHEMA_INVALID');
        delivery.ack();
        const deadLetter = await waitForDelivery(
          channel,
          topology.deadLetterQueue,
        );
        await control.replay(deadLetter);
        deadLetter.ack();
        const replayed = await waitForDelivery(channel, topology.queue);
        expect(replayed.body).toEqual(deadLetter.body);
        replayed.ack();
      } finally {
        await channel.close();
        await cleanupIsolatedRabbitTopology(rabbitUrl, topology);
      }
    },
    TEST_RABBIT_TIMEOUT_MS * 2,
  );

  it(
    'requires an actual retry delay before republishing a transient failure',
    async () => {
      const topology = testTopology();
      const channel = await connectRabbit();
      try {
        await declareAuthenticationTopology(channel, topology);
        const control = new RabbitConsumerControlAdapter({ channel, topology });
        const publisher = new RabbitConfirmPublisher(channel, topology);
        await publisher.publish(validEnvelope(), topology.bindingKey);
        const delivery = await channel.get(topology.queue);
        if (delivery === null) {
          throw new Error('RabbitMQ retry delivery was not available');
        }
        await control.retry(delivery, 2);
        delivery.ack();
        await new Promise<void>((resolve) =>
          setTimeout(resolve, TEST_RABBIT_RETRY_DELAY_MS),
        );
        expect(await channel.get(topology.queue)).toBeNull();
      } finally {
        await channel.close();
        await cleanupIsolatedRabbitTopology(rabbitUrl, topology);
      }
    },
    TEST_RABBIT_TIMEOUT_MS * 2,
  );

  function testTopology(): RabbitTopology {
    return createIsolatedRabbitTopology();
  }

  async function waitForDelivery(
    channel: AmqplibRabbitChannel,
    queue: string,
  ): Promise<RabbitDelivery> {
    const deadline = Date.now() + TEST_RABBIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const delivery = await channel.get(queue);
      if (delivery !== null) {
        return delivery;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`RabbitMQ queue ${queue} did not receive a delivery`);
  }
}

async function connectRabbit(): Promise<AmqplibRabbitChannel> {
  if (rabbitUrl === undefined) {
    throw new Error('BLOCKED AUTH-001 RabbitMQ: RABBITMQ_URLS is required');
  }
  try {
    return await AmqplibRabbitChannel.connect(rabbitUrl);
  } catch (error: unknown) {
    throw new Error(
      `BLOCKED AUTH-001 RabbitMQ: broker connection failed: ${
        error instanceof Error ? error.message : 'unknown connection error'
      }`,
    );
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
