import type {
  InboxLease,
  InboxAcquireInput,
  InboxAcquireResult,
  InboxStorePort,
  OutboxMessageRecord,
  OutboxClaimInput,
  OutboxDeadLetterInput,
  OutboxLeaseTransitionInput,
  OutboxRetryInput,
  OutboxStorePort,
} from '../../../application/ports/messaging.types';
import { INBOX_LEASE_MS } from '../retry-dlq/messaging.constants';
import type {
  InMemoryOutboxInput,
  InMemoryInboxRecord,
  StoredOutboxMessage,
} from './in-memory-messaging.types';

export class InMemoryOutboxStore implements OutboxStorePort {
  private readonly messages = new Map<string, StoredOutboxMessage>();

  public add(input: InMemoryOutboxInput): void {
    this.messages.set(input.id, {
      ...input,
      messageId: input.id,
      eventType: input.event.type,
      eventVersion: 1,
      schemaVersion: 1,
      causationId: null,
      tenantId: null,
      attempts: 0,
      availableAt: input.event.occurredAt,
      leaseUntil: null,
      leaseOwner: null,
      leaseVersion: 0,
      status: 'PENDING',
      lastErrorCode: null,
      publishedAt: null,
      deadLetteredAt: null,
    });
  }

  public claim({
    owner,
    limit,
    now,
    leaseMs,
  }: OutboxClaimInput): ReadonlyArray<OutboxMessageRecord> {
    const claimed: OutboxMessageRecord[] = [];
    for (const message of this.messages.values()) {
      if (claimed.length >= limit || !isClaimable(message, now)) {
        continue;
      }
      message.attempts += 1;
      message.leaseUntil = new Date(now.getTime() + leaseMs);
      message.leaseOwner = owner;
      message.leaseVersion += 1;
      claimed.push(toOutboxClaim(message));
    }
    return claimed;
  }

  public markPublished(input: OutboxLeaseTransitionInput): boolean {
    const message = this.messages.get(input.messageId);
    if (message !== undefined && ownsOutboxLease(message, input)) {
      message.status = 'PUBLISHED';
      message.leaseUntil = null;
      message.leaseOwner = null;
      message.publishedAt = input.now;
      return true;
    }
    return false;
  }

  public scheduleRetry(input: OutboxRetryInput): boolean {
    const message = this.messages.get(input.messageId);
    if (message !== undefined && ownsOutboxLease(message, input)) {
      message.availableAt = input.availableAt;
      message.leaseUntil = null;
      message.leaseOwner = null;
      message.lastErrorCode = input.errorCode;
      return true;
    }
    return false;
  }

  public deadLetter(input: OutboxDeadLetterInput): boolean {
    const message = this.messages.get(input.messageId);
    if (message !== undefined && ownsOutboxLease(message, input)) {
      message.status = 'DLQ';
      message.leaseUntil = null;
      message.leaseOwner = null;
      message.lastErrorCode = input.errorCode;
      message.deadLetteredAt = input.now;
      return true;
    }
    return false;
  }

  public get(id: string): StoredOutboxMessage | null {
    const message = this.messages.get(id);
    return message === undefined ? null : { ...message };
  }
}

export class InMemoryInboxStore implements InboxStorePort {
  private readonly messages = new Map<string, InMemoryInboxRecord>();

  public acquire({
    consumerName,
    eventId,
    messageId,
    receivedAt,
    owner,
  }: InboxAcquireInput): InboxAcquireResult {
    const key = `${consumerName}:${eventId}`;
    const current = this.messages.get(key);
    const duplicate =
      current?.status === 'PROCESSED' ||
      (current?.status === 'IN_FLIGHT' &&
        current.leaseUntil != null &&
        current.leaseUntil > receivedAt);
    if (duplicate) {
      return { outcome: 'DUPLICATE' };
    }
    const next: InMemoryInboxRecord = {
      messageId,
      receivedAt,
      status: 'IN_FLIGHT',
      leaseUntil: new Date(receivedAt.getTime() + INBOX_LEASE_MS),
      leaseOwner: owner,
      leaseVersion: (current?.leaseVersion ?? 0) + 1,
      attempts: (current?.attempts ?? 0) + 1,
      errorCode: null,
    };
    this.messages.set(key, next);
    return {
      outcome: 'ACQUIRED',
      lease: toInboxLease(consumerName, eventId, next),
    };
  }

  public complete(lease: InboxLease, processedAt: Date): boolean {
    const key = `${lease.consumerName}:${lease.eventId}`;
    const current = this.messages.get(key);
    if (current !== undefined && ownsInboxLease(current, lease, processedAt)) {
      this.messages.set(key, {
        ...current,
        status: 'PROCESSED',
        leaseUntil: null,
        leaseOwner: null,
      });
      return true;
    }
    return false;
  }

  public recordFailure(
    lease: InboxLease,
    errorCode: string,
    failedAt: Date,
  ): boolean {
    const key = `${lease.consumerName}:${lease.eventId}`;
    const current = this.messages.get(key);
    if (current !== undefined && ownsInboxLease(current, lease, failedAt)) {
      this.messages.set(key, {
        ...current,
        status: 'FAILED',
        leaseUntil: null,
        leaseOwner: null,
        errorCode,
      });
      return true;
    }
    return false;
  }

  public renewLease(lease: InboxLease, leaseUntil: Date, now: Date): boolean {
    const key = `${lease.consumerName}:${lease.eventId}`;
    const current = this.messages.get(key);
    if (current === undefined || !ownsInboxLease(current, lease, now)) {
      return false;
    }
    this.messages.set(key, { ...current, leaseUntil });
    return true;
  }
}

function isClaimable(message: StoredOutboxMessage, now: Date): boolean {
  return (
    message.status === 'PENDING' &&
    message.availableAt.getTime() <= now.getTime() &&
    (message.leaseUntil == null ||
      message.leaseUntil.getTime() <= now.getTime())
  );
}

function ownsOutboxLease(
  message: StoredOutboxMessage,
  input: OutboxLeaseTransitionInput,
): boolean {
  return (
    message.status === 'PENDING' &&
    message.leaseOwner === input.owner &&
    message.leaseVersion === input.leaseVersion &&
    message.attempts === input.attempt &&
    message.leaseUntil != null &&
    message.leaseUntil.getTime() > input.now.getTime()
  );
}

function toOutboxClaim(message: StoredOutboxMessage): OutboxMessageRecord {
  if (message.leaseOwner == null || message.leaseUntil == null) {
    throw new Error('outbox-lease-incomplete');
  }
  return {
    ...message,
    leaseOwner: message.leaseOwner,
    leaseUntil: message.leaseUntil,
  };
}

function ownsInboxLease(
  record: InMemoryInboxRecord,
  lease: InboxLease,
  now: Date,
): boolean {
  return (
    record.status === 'IN_FLIGHT' &&
    record.messageId === lease.messageId &&
    record.leaseOwner === lease.leaseOwner &&
    record.leaseVersion === lease.leaseVersion &&
    record.attempts === lease.attempt &&
    record.leaseUntil != null &&
    record.leaseUntil.getTime() > now.getTime()
  );
}

function toInboxLease(
  consumerName: string,
  eventId: string,
  record: InMemoryInboxRecord,
): InboxLease {
  if (record.leaseOwner == null || record.leaseUntil == null) {
    throw new Error('inbox-lease-incomplete');
  }
  return {
    consumerName,
    eventId,
    messageId: record.messageId,
    leaseOwner: record.leaseOwner,
    leaseUntil: record.leaseUntil,
    leaseVersion: record.leaseVersion,
    attempt: record.attempts,
  };
}
