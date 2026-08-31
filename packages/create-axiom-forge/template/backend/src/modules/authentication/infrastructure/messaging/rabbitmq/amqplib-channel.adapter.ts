import amqplib from 'amqplib';
import type {
  ChannelModel,
  ConfirmChannel,
  ConsumeMessage,
  Message,
} from 'amqplib';
import type {
  RabbitConsumerChannelPort,
  RabbitDelivery,
} from '../../../application/ports/messaging.types';
import { RABBIT_CONNECTION_TIMEOUT_MS } from './rabbitmq.constants';

/**
 * Production RabbitMQ channel adapter backed by the `amqplib` client.
 * Implements the same `RabbitConsumerChannelPort` already consumed by the
 * inbox consumer, outbox relay and topology declaration — no InMemory/fake
 * transport is used in production.
 */
export class AmqplibRabbitChannel implements RabbitConsumerChannelPort {
  private readonly returnedMessageIds = new Set<string>();

  private constructor(
    private readonly connection: ChannelModel,
    private readonly channel: ConfirmChannel,
  ) {
    this.channel.on('return', (message: ConsumeMessage) => {
      const messageId = readOptionalString(message.properties.messageId);
      if (messageId !== undefined) {
        this.returnedMessageIds.add(messageId);
      }
    });
  }

  public static async connect(url: string): Promise<AmqplibRabbitChannel> {
    const connection = await amqplib.connect(url, {
      timeout: RABBIT_CONNECTION_TIMEOUT_MS,
    });
    const channel = await connection.createConfirmChannel();
    return new AmqplibRabbitChannel(connection, channel);
  }

  public async assertExchange(
    exchange: string,
    type: 'topic',
    options: { readonly durable: true },
  ): Promise<unknown> {
    return await this.channel.assertExchange(exchange, type, options);
  }

  public async assertQueue(
    queue: string,
    options: {
      readonly durable: true;
      readonly arguments: Readonly<Record<string, string | number>>;
    },
  ): Promise<unknown> {
    return await this.channel.assertQueue(queue, {
      durable: options.durable,
      arguments: options.arguments,
    });
  }

  public async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<unknown> {
    return await this.channel.bindQueue(queue, exchange, routingKey);
  }

  public async prefetch(count: number): Promise<void> {
    await this.channel.prefetch(count);
  }

  public async consume(
    queue: string,
    handler: (delivery: RabbitDelivery) => Promise<void>,
    options: { readonly noAck: false },
  ): Promise<unknown> {
    return await this.channel.consume(
      queue,
      (message) => {
        if (message == null) {
          return;
        }
        void handler(new AmqplibRabbitDelivery(message, this.channel));
      },
      { noAck: options.noAck },
    );
  }

  /**
   * Pull a single message without a consumer subscription (`basic.get`).
   * Not part of `RabbitConsumerChannelPort`; used by tests/tools that poll a
   * queue directly rather than subscribing.
   */
  public async get(queue: string): Promise<RabbitDelivery | null> {
    const message = await this.channel.get(queue);
    return message === false
      ? null
      : new AmqplibRabbitDelivery(message, this.channel);
  }

  public async publishConfirmed(
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
    await new Promise<void>((resolve, reject) => {
      this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(body),
        {
          contentType: options.contentType,
          deliveryMode: options.deliveryMode,
          mandatory: options.mandatory,
          messageId: options.messageId,
          type: options.type,
          headers: { ...options.headers },
        },
        (error) => {
          if (error != null) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }
          if (this.returnedMessageIds.delete(options.messageId)) {
            reject(
              new Error(
                'RabbitMQ mandatory publish returned unroutable message',
              ),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  public async close(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}

class AmqplibRabbitDelivery implements RabbitDelivery {
  public readonly body: Uint8Array;
  public readonly fields: RabbitDelivery['fields'];
  public readonly properties: RabbitDelivery['properties'];

  public constructor(
    private readonly message: Message,
    private readonly channel: ConfirmChannel,
  ) {
    this.body = message.content;
    this.fields = {
      exchange: message.fields.exchange,
      routingKey: message.fields.routingKey,
    };
    const messageId = readOptionalString(message.properties.messageId);
    const type = readOptionalString(message.properties.type);
    const headers = readOptionalHeaders(message.properties.headers);
    this.properties = {
      ...(messageId === undefined ? {} : { messageId }),
      ...(type === undefined ? {} : { type }),
      ...(headers === undefined ? {} : { headers }),
    };
  }

  public ack(): void {
    this.channel.ack(this.message);
  }

  public reject(requeue: boolean): void {
    this.channel.reject(this.message, requeue);
  }
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readOptionalHeaders(
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value != null;
}
