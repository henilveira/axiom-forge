import type { AuthenticationMessagingRuntime } from '../../../application/ports/authentication-runtime.port';
import type { AuthenticationLoggerPort } from '../../../application/ports/logger.port';
import type { RabbitConsumerChannelPort } from '../../../application/ports/messaging.types';
import { InboxEventProcessor } from '../inbox/inbox-event.processor';
import { OutboxRelay } from '../outbox/outbox-relay';
import {
  AuthenticationRabbitConsumer,
  RabbitConsumerControlAdapter,
} from './inbox-consumer.adapter';
import {
  AUTHENTICATION_RABBIT_TOPOLOGY,
  RABBIT_RELAY_INTERVAL_MS,
} from './rabbitmq.constants';
import { RabbitConfirmPublisher } from './rabbit.publisher';
import type { AuthenticationRabbitMessagingRuntimeDependencies } from './authentication-messaging.types';

export class AuthenticationRabbitMessagingRuntime implements AuthenticationMessagingRuntime {
  private readonly consumer: AuthenticationRabbitConsumer;
  private readonly relay: OutboxRelay;
  private readonly channel: RabbitConsumerChannelPort;
  private readonly logger: AuthenticationLoggerPort;
  private relayTimer: NodeJS.Timeout | undefined;
  private started = false;

  public constructor(
    dependencies: AuthenticationRabbitMessagingRuntimeDependencies,
  ) {
    this.channel = dependencies.rabbitChannel;
    this.logger = dependencies.logger;
    const publisher = new RabbitConfirmPublisher(
      dependencies.rabbitChannel,
      AUTHENTICATION_RABBIT_TOPOLOGY,
    );
    this.relay = new OutboxRelay(
      dependencies.outboxStore,
      publisher,
      dependencies.logger,
    );
    const processor = new InboxEventProcessor(
      dependencies.inboxStore,
      dependencies.eventHandler,
      dependencies.logger,
      {
        consumerName: AUTHENTICATION_RABBIT_TOPOLOGY.queue,
        exchange: AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
        routingKey: AUTHENTICATION_RABBIT_TOPOLOGY.bindingKey,
      },
    );
    this.consumer = new AuthenticationRabbitConsumer(
      dependencies.rabbitChannel,
      processor,
      new RabbitConsumerControlAdapter({
        channel: dependencies.rabbitChannel,
        topology: AUTHENTICATION_RABBIT_TOPOLOGY,
      }),
      AUTHENTICATION_RABBIT_TOPOLOGY,
    );
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }
    await this.consumer.start();
    this.started = true;
    await this.runRelayCycle();
  }

  public async stop(): Promise<void> {
    this.started = false;
    if (this.relayTimer !== undefined) {
      clearTimeout(this.relayTimer);
      this.relayTimer = undefined;
    }
    await this.channel.close();
  }

  private async runRelayCycle(): Promise<void> {
    try {
      await this.relay.publishAvailable(new Date());
    } catch {
      this.logRelayFailure();
    } finally {
      if (this.started) {
        this.scheduleRelay();
      }
    }
  }

  private scheduleRelay(): void {
    this.relayTimer = setTimeout(() => {
      this.runRelayCycle().catch(() => {
        this.logRelayFailure();
      });
    }, RABBIT_RELAY_INTERVAL_MS);
  }

  private logRelayFailure(): void {
    const recordedAt = new Date().toISOString();
    this.logger.warn('retry_scheduled', {
      eventId: null,
      eventType: null,
      eventVersion: null,
      messageId: null,
      correlationId: null,
      causationId: null,
      producer: null,
      consumer: null,
      exchange: AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
      routingKey: null,
      tenantId: null,
      attempt: null,
      outcome: 'failure',
      durationMs: null,
      occurredAt: null,
      recordedAt,
      errorCode: 'RELAY_FAILED',
    });
  }
}
