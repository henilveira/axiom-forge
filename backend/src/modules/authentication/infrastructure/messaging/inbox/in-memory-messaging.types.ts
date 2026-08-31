import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type { OutboxMessageRecord } from '../../../application/ports/messaging.types';

export interface StoredOutboxMessage extends Omit<
  OutboxMessageRecord,
  'leaseOwner' | 'leaseUntil' | 'leaseVersion'
> {
  availableAt: Date;
  leaseUntil: Date | null;
  leaseOwner: string | null;
  leaseVersion: number;
  status: 'PENDING' | 'PUBLISHED' | 'DLQ';
  attempts: number;
  lastErrorCode: string | null;
  publishedAt: Date | null;
  deadLetteredAt: Date | null;
}

export interface InMemoryOutboxInput {
  readonly id: string;
  readonly eventId: string;
  readonly event: AuthenticationDomainEvent;
  readonly correlationId: string;
}

type InMemoryInboxStatus = 'IN_FLIGHT' | 'PROCESSED' | 'FAILED';

export interface InMemoryInboxRecord {
  readonly messageId: string;
  readonly receivedAt: Date;
  readonly status: InMemoryInboxStatus;
  readonly leaseUntil: Date | null;
  readonly leaseOwner: string | null;
  readonly leaseVersion: number;
  readonly attempts: number;
  readonly errorCode: string | null;
}
