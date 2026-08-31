import type { AuthenticationDomainEvent } from '../../domain/events/authentication.event';

export type MessagingResult<T> = T | Promise<T>;

export interface OutboxMessageRecord {
  readonly id: string;
  readonly messageId: string;
  readonly eventId: string;
  readonly event: AuthenticationDomainEvent;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly schemaVersion: number;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly tenantId: string | null;
  readonly attempts: number;
  readonly leaseOwner: string;
  readonly leaseUntil: Date;
  readonly leaseVersion: number;
}

export interface OutboxStorePort {
  claim(
    input: OutboxClaimInput,
  ): MessagingResult<ReadonlyArray<OutboxMessageRecord>>;
  markPublished(input: OutboxLeaseTransitionInput): MessagingResult<boolean>;
  scheduleRetry(input: OutboxRetryInput): MessagingResult<boolean>;
  deadLetter(input: OutboxDeadLetterInput): MessagingResult<boolean>;
}

export interface OutboxClaimInput {
  readonly owner: string;
  readonly limit: number;
  readonly now: Date;
  readonly leaseMs: number;
}

export interface OutboxLeaseTransitionInput {
  readonly messageId: string;
  readonly owner: string;
  readonly leaseVersion: number;
  readonly attempt: number;
  readonly now: Date;
}

export interface OutboxRetryInput extends OutboxLeaseTransitionInput {
  readonly availableAt: Date;
  readonly errorCode: string;
}

export interface OutboxDeadLetterInput extends OutboxLeaseTransitionInput {
  readonly errorCode: string;
}

export interface InboxLease {
  readonly consumerName: string;
  readonly eventId: string;
  readonly messageId: string;
  readonly leaseOwner: string;
  readonly leaseUntil: Date;
  readonly leaseVersion: number;
  readonly attempt: number;
}

export interface InboxAcquireResult {
  readonly outcome: 'ACQUIRED' | 'DUPLICATE';
  readonly lease?: InboxLease;
}

export interface InboxStorePort {
  acquire(input: InboxAcquireInput): MessagingResult<InboxAcquireResult>;
  complete(lease: InboxLease, processedAt: Date): MessagingResult<boolean>;
  recordFailure(
    lease: InboxLease,
    errorCode: string,
    failedAt: Date,
  ): MessagingResult<boolean>;
  renewLease(
    lease: InboxLease,
    leaseUntil: Date,
    now: Date,
  ): MessagingResult<boolean>;
}

export interface InboxAcquireInput {
  readonly consumerName: string;
  readonly eventId: string;
  readonly messageId: string;
  readonly receivedAt: Date;
  readonly owner: string;
}

export interface IntegrationEventEnvelope {
  readonly messageId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly schemaVersion: number;
  readonly occurredAt: string;
  readonly producer: 'backend.identity';
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly tenantId: string | null;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface RabbitConfirmPublisherPort {
  publish(
    envelope: IntegrationEventEnvelope,
    routingKey: string,
  ): void | Promise<void>;
}

export interface OutboxRelayOptions {
  readonly ownerId?: string;
  readonly batchSize?: number;
  readonly leaseMs?: number;
  readonly maxAttempts?: number;
  readonly retryBaseMs?: number;
  readonly retryMaxMs?: number;
}

export interface RabbitConfirmChannelPort {
  assertExchange(
    exchange: string,
    type: 'topic',
    options: { readonly durable: true },
  ): Promise<unknown>;
  publishConfirmed(
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
  ): Promise<void>;
}

export interface RabbitDelivery {
  readonly body: Uint8Array;
  readonly fields: {
    readonly exchange: string;
    readonly routingKey: string;
  };
  readonly properties: {
    readonly messageId?: string;
    readonly type?: string;
    readonly headers?: Readonly<Record<string, unknown>>;
  };
  ack(): void;
  reject(requeue: boolean): void;
}

export interface RabbitConsumerChannelPort extends RabbitConfirmChannelPort {
  assertQueue(
    queue: string,
    options: {
      readonly durable: true;
      readonly arguments: Readonly<Record<string, string | number>>;
    },
  ): Promise<unknown>;
  bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<unknown>;
  prefetch(count: number): Promise<void>;
  consume(
    queue: string,
    handler: (delivery: RabbitDelivery) => Promise<void>,
    options: { readonly noAck: false },
  ): Promise<unknown>;
  close(): Promise<void>;
}

export interface RabbitTopology {
  readonly exchange: string;
  readonly queue: string;
  readonly retryExchange: string;
  readonly retryQueues: ReadonlyArray<{
    readonly queue: string;
    readonly ttlMs: number;
  }>;
  readonly deadLetterExchange: string;
  readonly deadLetterQueue: string;
  readonly bindingKey: string;
  readonly prefetchCount: number;
}

export interface InboxProcessorOptions {
  readonly consumerName: string;
  readonly leaseOwner?: string;
  readonly maxAttempts?: number;
  readonly exchange?: string;
  readonly routingKey?: string;
}

export interface InboxFailureDetails {
  readonly parsed: IntegrationEventEnvelope;
  readonly attempt: number;
  readonly errorCode: string;
  readonly startedAt: number;
  readonly retryable: boolean;
}

export interface IntegrationEventHandlerPort {
  handle(envelope: IntegrationEventEnvelope): void | Promise<void>;
}

export type InboundProcessingResult =
  'PROCESSED' | 'DUPLICATE' | 'RETRY' | 'DEAD_LETTERED' | 'REJECTED';
