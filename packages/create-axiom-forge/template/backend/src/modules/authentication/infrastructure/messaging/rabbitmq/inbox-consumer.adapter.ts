import type {
  InboundProcessingResult,
  RabbitConsumerChannelPort,
  RabbitDelivery,
} from '../../../application/ports/messaging.types';
import type { InboxEventProcessor } from '../inbox/inbox-event.processor';
import { declareAuthenticationTopology } from './rabbitmq-topology';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from './rabbitmq.constants';
import type { RabbitTopology } from '../../../application/ports/messaging.types';
import type {
  RabbitConsumerControl,
  RabbitControlDependencies,
  RabbitControlPublishInput,
} from './rabbitmq.types';
import { RABBIT_ATTEMPT_HEADER } from './rabbitmq.constants';

export class AuthenticationRabbitConsumer {
  private readonly processor: InboxEventProcessor;

  public constructor(
    private readonly channel: RabbitConsumerChannelPort,
    processor: InboxEventProcessor,
    private readonly control: RabbitConsumerControl,
    private readonly topology: RabbitTopology = AUTHENTICATION_RABBIT_TOPOLOGY,
  ) {
    this.processor = processor;
  }

  public async start(): Promise<void> {
    await declareAuthenticationTopology(this.channel, this.topology);
    const options: { readonly noAck: false } = { noAck: false };
    await this.channel.consume(
      this.topology.queue,
      (delivery) => this.handleDelivery(delivery),
      options,
    );
  }

  private async handleDelivery(delivery: RabbitDelivery): Promise<void> {
    const receivedAt = new Date();
    const attempt = readAttempt(delivery);
    let result: InboundProcessingResult;
    try {
      result = await this.processor.process(
        parseBody(delivery.body),
        receivedAt,
        attempt,
      );
    } catch {
      try {
        await this.control.deadLetter(delivery, 'CONSUMER_FAILED');
        delivery.ack();
      } catch {
        delivery.reject(false);
      }
      return;
    }
    await this.finishDelivery(delivery, result, attempt);
  }

  private async finishDelivery(
    delivery: RabbitDelivery,
    result: InboundProcessingResult,
    attempt: number,
  ): Promise<void> {
    if (result === 'PROCESSED' || result === 'DUPLICATE') {
      delivery.ack();
      return;
    }
    if (result === 'RETRY') {
      try {
        await this.control.retry(delivery, attempt + 1);
        delivery.ack();
      } catch {
        delivery.reject(false);
      }
      return;
    }
    try {
      await this.control.deadLetter(
        delivery,
        result === 'REJECTED' ? 'SCHEMA_INVALID' : 'CONSUMER_FAILED',
      );
      delivery.ack();
    } catch {
      delivery.reject(false);
    }
  }
}

function parseBody(body: Uint8Array): unknown {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    return parsed;
  } catch {
    return null;
  }
}

function readAttempt(delivery: RabbitDelivery): number {
  const value = delivery.properties.headers?.[RABBIT_ATTEMPT_HEADER];
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : 1;
}

export class RabbitConsumerControlAdapter implements RabbitConsumerControl {
  public constructor(dependencies: RabbitControlDependencies) {
    this.channel = dependencies.channel;
    this.topology = dependencies.topology;
  }

  private readonly channel: RabbitConsumerChannelPort;
  private readonly topology: RabbitTopology;

  public async retry(delivery: RabbitDelivery, attempt: number): Promise<void> {
    await this.publish({
      delivery,
      exchange: this.topology.retryExchange,
      routingKey: delivery.fields.routingKey,
      attempt,
    });
  }

  public async deadLetter(
    delivery: RabbitDelivery,
    errorCode: string,
  ): Promise<void> {
    await this.publish({
      delivery,
      exchange: this.topology.deadLetterExchange,
      routingKey: delivery.fields.routingKey,
      attempt: null,
      errorCode,
    });
  }

  public async replay(delivery: RabbitDelivery): Promise<void> {
    await this.publish({
      delivery,
      exchange: this.topology.exchange,
      routingKey: delivery.fields.routingKey,
      attempt: 1,
    });
  }

  private async publish(input: RabbitControlPublishInput): Promise<void> {
    const { delivery, exchange, routingKey, attempt, errorCode } = input;
    const messageId = delivery.properties.messageId;
    const type = delivery.properties.type;
    if (
      messageId === undefined ||
      type === undefined ||
      routingKey.length === 0
    ) {
      throw new Error('rabbit-delivery-metadata-missing');
    }
    const headers = scalarHeaders(delivery.properties.headers);
    headers[RABBIT_ATTEMPT_HEADER] = attempt;
    headers['errorCode'] = errorCode ?? null;
    await this.channel.publishConfirmed(exchange, routingKey, delivery.body, {
      contentType: 'application/json',
      deliveryMode: 2,
      mandatory: true,
      messageId,
      type,
      headers,
    });
  }
}

function scalarHeaders(
  headers: Readonly<Record<string, unknown>> | undefined,
): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') {
      result[key] = value;
    } else if (value == null) {
      result[key] = null;
    }
  }
  return result;
}
