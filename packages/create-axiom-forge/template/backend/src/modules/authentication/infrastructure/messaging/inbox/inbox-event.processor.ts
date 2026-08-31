import { randomUUID } from 'node:crypto';
import { AuthenticationError } from '../../../domain/errors/authentication.error';
import type {
  AuthenticationLogMetadata,
  AuthenticationLoggerPort,
} from '../../../application/ports/logger.port';
import type {
  InboxProcessorOptions,
  InboxStorePort,
  InboxLease,
  InboundProcessingResult,
  InboxFailureDetails,
  IntegrationEventEnvelope,
  IntegrationEventHandlerPort,
} from '../../../application/ports/messaging.types';
import { parseAuthenticationEnvelope } from '../contracts/authentication-envelope.schema';
import {
  INBOX_CONSUMER_FAILED,
  INBOX_LEASE_LOST,
  INBOX_SCHEMA_INVALID,
  MESSAGE_MAX_ATTEMPTS,
} from '../retry-dlq/messaging.constants';

export class InboxEventProcessor {
  private readonly leaseOwner: string;

  public constructor(
    private readonly store: InboxStorePort,
    private readonly handler: IntegrationEventHandlerPort,
    private readonly logger: AuthenticationLoggerPort,
    private readonly options: InboxProcessorOptions,
  ) {
    this.leaseOwner = options.leaseOwner ?? randomUUID();
  }

  public async process(
    envelope: unknown,
    receivedAt: Date,
    attempt: number,
  ): Promise<InboundProcessingResult> {
    const parsed = parseAuthenticationEnvelope(envelope);
    if (parsed == null) {
      this.logger.warn('rejected', {
        errorCode: INBOX_SCHEMA_INVALID,
        consumer: this.options.consumerName,
        eventId: null,
        eventType: null,
        eventVersion: null,
        messageId: null,
        correlationId: null,
        causationId: null,
        producer: null,
        tenantId: null,
        exchange: this.options.exchange ?? null,
        routingKey: this.options.routingKey ?? null,
        occurredAt: null,
        recordedAt: new Date().toISOString(),
        durationMs: 0,
        attempt,
        outcome: 'rejected',
      });
      return 'REJECTED';
    }
    this.logger.info('received', metadata(parsed, this.options, attempt));
    const acquired = await this.store.acquire({
      consumerName: this.options.consumerName,
      eventId: parsed.eventId,
      messageId: parsed.messageId,
      receivedAt,
      owner: this.leaseOwner,
    });
    if (acquired.outcome === 'DUPLICATE') {
      this.logger.info('duplicate', metadata(parsed, this.options, attempt));
      return 'DUPLICATE';
    }
    this.logger.info('stored', metadata(parsed, this.options, attempt));
    if (acquired.lease === undefined) {
      throw new Error('inbox-acquire-without-lease');
    }
    return await this.processAcquired(parsed, acquired.lease, attempt);
  }

  private async processAcquired(
    parsed: IntegrationEventEnvelope,
    lease: InboxLease,
    attempt: number,
  ): Promise<InboundProcessingResult> {
    const startedAt = Date.now();
    try {
      await this.handler.handle(parsed);
      const completed = await this.store.complete(lease, new Date());
      if (!completed) {
        this.logger.warn(
          'retry_scheduled',
          metadata(parsed, this.options, attempt, {
            errorCode: INBOX_LEASE_LOST,
            startedAt,
          }),
        );
        return 'RETRY';
      }
      this.logger.info(
        'processed',
        metadata(parsed, this.options, attempt, { startedAt }),
      );
      return 'PROCESSED';
    } catch (error: unknown) {
      const errorCode = errorCodeFor(error);
      await this.store.recordFailure(lease, errorCode, new Date());
      return this.finishFailure({
        parsed,
        attempt,
        errorCode,
        startedAt,
        retryable: isRetryable(error),
      });
    }
  }

  private finishFailure(details: InboxFailureDetails): InboundProcessingResult {
    if (!details.retryable) {
      this.logger.warn(
        'rejected',
        metadata(details.parsed, this.options, details.attempt, {
          errorCode: details.errorCode,
          startedAt: details.startedAt,
        }),
      );
      return 'DEAD_LETTERED';
    }
    if (details.attempt >= (this.options.maxAttempts ?? MESSAGE_MAX_ATTEMPTS)) {
      this.logger.warn(
        'dead_lettered',
        metadata(details.parsed, this.options, details.attempt, {
          errorCode: details.errorCode,
          startedAt: details.startedAt,
        }),
      );
      return 'DEAD_LETTERED';
    }
    this.logger.warn(
      'retry_scheduled',
      metadata(details.parsed, this.options, details.attempt, {
        errorCode: details.errorCode,
        startedAt: details.startedAt,
      }),
    );
    return 'RETRY';
  }
}

function errorCodeFor(error: unknown): string {
  return error instanceof AuthenticationError
    ? error.code
    : INBOX_CONSUMER_FAILED;
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AuthenticationError)) {
    return true;
  }
  return error.code === 'PROVIDER_UNAVAILABLE' || error.code === 'RATE_LIMITED';
}

function metadata(
  envelope: IntegrationEventEnvelope,
  options: InboxProcessorOptions,
  attempt: number,
  details: { readonly errorCode?: string; readonly startedAt?: number } = {},
): AuthenticationLogMetadata {
  const recordedAt = new Date();
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
    consumer: options.consumerName,
    exchange: options.exchange ?? null,
    routingKey: options.routingKey ?? null,
    tenantId: envelope.tenantId,
    occurredAt: envelope.occurredAt,
    recordedAt: recordedAt.toISOString(),
    durationMs: Math.max(0, recordedAt.getTime() - startedAt),
    attempt,
    outcome: errorCode == null ? 'success' : 'failure',
    errorCode,
  };
}
