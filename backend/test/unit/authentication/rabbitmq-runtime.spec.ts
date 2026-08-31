import type {
  RabbitConsumerChannelPort,
  RabbitDelivery,
} from '../../../src/modules/authentication/application/ports/messaging.types';
import { RabbitConsumerControlAdapter } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/inbox-consumer.adapter';
import {
  AUTHENTICATION_RABBIT_TOPOLOGY,
  RABBIT_MESSAGE_TTL_ARGUMENT,
} from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbitmq.constants';
import { declareAuthenticationTopology } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbitmq-topology';

class RecordingChannel implements RabbitConsumerChannelPort {
  public readonly queues: Array<{
    readonly name: string;
    readonly arguments: Readonly<Record<string, string | number>>;
  }> = [];
  public readonly publications: Array<{
    readonly exchange: string;
    readonly routingKey: string;
    readonly headers: Readonly<Record<string, string | number | null>>;
  }> = [];

  public assertExchange(exchange: string): Promise<void> {
    return completed(exchange);
  }

  public assertQueue(
    queue: string,
    options: {
      readonly durable: true;
      readonly arguments: Readonly<Record<string, string | number>>;
    },
  ): Promise<void> {
    this.queues.push({ name: queue, arguments: options.arguments });
    return completed(options.durable);
  }

  public bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<void> {
    return completed(`${queue}:${exchange}:${routingKey}`);
  }

  public prefetch(count: number): Promise<void> {
    return completed(count);
  }

  public consume(
    queue: string,
    handler: (delivery: RabbitDelivery) => Promise<void>,
    options: { readonly noAck: false },
  ): Promise<void> {
    return completed(`${queue}:${handler.name}:${options.noAck}`);
  }

  public publishConfirmed(
    exchange: string,
    routingKey: string,
    body: Uint8Array,
    options: {
      readonly contentType: 'application/json';
      readonly deliveryMode: 2;
      readonly mandatory: true;
      readonly messageId: string;
      readonly type: string;
      readonly headers: Readonly<Record<string, string | number | null>>;
    },
  ): Promise<void> {
    this.publications.push({ exchange, routingKey, headers: options.headers });
    return completed(body.byteLength);
  }

  public close(): Promise<void> {
    return completed(true);
  }
}

function completed<T>(value: T): Promise<void> {
  return new Promise<void>((resolve) => {
    if (value === undefined) {
      resolve();
      return;
    }
    expect(value).toBeDefined();
    resolve();
  });
}

describe('RabbitMQ authentication runtime', () => {
  it('declares durable retry queues with executable TTL and DLX', async () => {
    const channel = new RecordingChannel();

    await declareAuthenticationTopology(channel);

    const retryQueue = channel.queues.find(
      (queue) =>
        queue.name === AUTHENTICATION_RABBIT_TOPOLOGY.retryQueues[0]?.queue,
    );
    expect(retryQueue).toMatchObject({
      arguments: {
        [RABBIT_MESSAGE_TTL_ARGUMENT]:
          AUTHENTICATION_RABBIT_TOPOLOGY.retryQueues[0]?.ttlMs,
        'x-dead-letter-exchange': AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
        'x-queue-type': 'quorum',
      },
    });
  });

  it('publishes retry through the delayed exchange and waits for confirmation', async () => {
    const channel = new RecordingChannel();
    const control = new RabbitConsumerControlAdapter({
      channel,
      topology: AUTHENTICATION_RABBIT_TOPOLOGY,
    });
    const delivery: RabbitDelivery = {
      body: new Uint8Array([1]),
      fields: {
        exchange: AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
        routingKey: 'identity.authentication.EmailVerified.v1',
      },
      properties: {
        messageId: 'message-1',
        type: 'identity.authentication.EmailVerified.v1',
        headers: { correlationId: 'correlation-1' },
      },
      ack(): void {},
      reject(): void {},
    };

    await control.retry(delivery, 2);

    expect(channel.publications).toEqual([
      {
        exchange: AUTHENTICATION_RABBIT_TOPOLOGY.retryExchange,
        routingKey: delivery.fields.routingKey,
        headers: {
          correlationId: 'correlation-1',
          'x-attempt': 2,
          errorCode: null,
        },
      },
    ]);
  });
});
