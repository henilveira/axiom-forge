import { randomUUID } from 'node:crypto';
import type {
  AuthenticationLogMetadata,
  AuthenticationLoggerPort,
} from '../../../application/ports/logger.port';
import type {
  IntegrationEventEnvelope,
  OutboxMessageRecord,
  OutboxRelayOptions,
  OutboxStorePort,
  RabbitConfirmPublisherPort,
} from '../../../application/ports/messaging.types';
import { toIntegrationEvent } from '../contracts/integration-event.mapper';
import {
  MESSAGE_MAX_ATTEMPTS,
  MESSAGE_RETRY_BASE_MS,
  MESSAGE_RETRY_MAX_MS,
  OUTBOX_BATCH_SIZE,
  OUTBOX_LEASE_MS,
  OUTBOX_PUBLISH_FAILED,
} from '../retry-dlq/messaging.constants';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from '../rabbitmq/rabbitmq.constants';
import type { MessagingTransitionDetails } from '../observability/messaging.logger.types';

export class OutboxRelay {
  private readonly options: Required<OutboxRelayOptions>;

  public constructor(
    private readonly store: OutboxStorePort,
    private readonly publisher: RabbitConfirmPublisherPort,
    private readonly logger: AuthenticationLoggerPort,
    options: OutboxRelayOptions = {},
  ) {
    this.options = {
      ownerId: options.ownerId ?? randomUUID(),
      batchSize: options.batchSize ?? OUTBOX_BATCH_SIZE,
      leaseMs: options.leaseMs ?? OUTBOX_LEASE_MS,
      maxAttempts: options.maxAttempts ?? MESSAGE_MAX_ATTEMPTS,
      retryBaseMs: options.retryBaseMs ?? MESSAGE_RETRY_BASE_MS,
      retryMaxMs: options.retryMaxMs ?? MESSAGE_RETRY_MAX_MS,
    };
  }

  public async publishAvailable(now: Date): Promise<number> {
    const messages = await this.store.claim({
      owner: this.options.ownerId,
      limit: this.options.batchSize,
      now,
      leaseMs: this.options.leaseMs,
    });
    for (const message of messages) {
      await this.publishOne(message, now);
    }
    return messages.length;
  }

  private async publishOne(
    message: OutboxMessageRecord,
    now: Date,
  ): Promise<void> {
    const envelope = toIntegrationEvent(message);
    const startedAt = Date.now();
    try {
      await this.publisher.publish(envelope, routingKeyFor(envelope));
      const markedPublished = await this.store.markPublished({
        messageId: message.id,
        owner: message.leaseOwner,
        leaseVersion: message.leaseVersion,
        attempt: message.attempts,
        now,
      });
      if (!markedPublished) {
        return;
      }
      this.logger.info(
        'published',
        transitionMetadata(envelope, message.attempts, {
          recordedAt: now,
          startedAt,
        }),
      );
    } catch {
      const errorCode = OUTBOX_PUBLISH_FAILED;
      if (message.attempts >= this.options.maxAttempts) {
        const deadLettered = await this.store.deadLetter({
          messageId: message.id,
          owner: message.leaseOwner,
          leaseVersion: message.leaseVersion,
          attempt: message.attempts,
          now,
          errorCode,
        });
        if (!deadLettered) {
          return;
        }
        this.logger.warn(
          'dead_lettered',
          transitionMetadata(envelope, message.attempts, {
            errorCode,
            recordedAt: now,
            startedAt,
          }),
        );
        return;
      }
      const delay = retryDelay(
        message.attempts,
        this.options.retryBaseMs,
        this.options.retryMaxMs,
      );
      const scheduled = await this.store.scheduleRetry({
        messageId: message.id,
        owner: message.leaseOwner,
        leaseVersion: message.leaseVersion,
        attempt: message.attempts,
        now,
        availableAt: new Date(now.getTime() + delay),
        errorCode,
      });
      if (!scheduled) {
        return;
      }
      this.logger.warn(
        'retry_scheduled',
        transitionMetadata(envelope, message.attempts, {
          errorCode,
          recordedAt: now,
          startedAt,
        }),
      );
    }
  }
}

function retryDelay(attempts: number, baseMs: number, maxMs: number): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempts - 1));
}

function routingKeyFor(envelope: IntegrationEventEnvelope): string {
  return envelope.eventType;
}

function transitionMetadata(
  envelope: IntegrationEventEnvelope,
  attempt: number,
  details: MessagingTransitionDetails = {},
): AuthenticationLogMetadata {
  const recordedAt = details.recordedAt ?? new Date();
  const startedAt = details.startedAt ?? recordedAt.getTime();
  const errorCode = details.errorCode ?? null;
  return {
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    eventVersion: envelope.eventVersion,
    messageId: envelope.messageId,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    producer: envelope.producer,
    consumer: null,
    tenantId: envelope.tenantId,
    exchange: AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
    routingKey: envelope.eventType,
    occurredAt: envelope.occurredAt,
    recordedAt: recordedAt.toISOString(),
    durationMs: Math.max(0, recordedAt.getTime() - startedAt),
    attempt,
    outcome: errorCode == null ? 'success' : 'failure',
    errorCode,
  };
}
