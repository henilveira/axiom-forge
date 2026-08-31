import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type {
  IntegrationEventEnvelope,
  OutboxMessageRecord,
} from '../../../application/ports/messaging.types';
import {
  AUTHENTICATION_EVENT_PRODUCER,
  AUTHENTICATION_EVENT_TYPE_PREFIX,
} from './event.constants';

export function toIntegrationEvent(
  message: OutboxMessageRecord,
): IntegrationEventEnvelope {
  return {
    messageId: message.messageId,
    eventId: message.eventId,
    eventType: `${AUTHENTICATION_EVENT_TYPE_PREFIX}.${message.eventType}.v${message.eventVersion}`,
    eventVersion: message.eventVersion,
    schemaVersion: message.schemaVersion,
    occurredAt: message.event.occurredAt.toISOString(),
    producer: AUTHENTICATION_EVENT_PRODUCER,
    correlationId: message.correlationId,
    causationId: message.causationId,
    tenantId: message.tenantId,
    data: toSafeData(message.event),
  };
}

function toSafeData(
  event: AuthenticationDomainEvent,
): Readonly<Record<string, unknown>> {
  const data: Record<string, unknown> = { ...event };
  data['occurredAt'] = event.occurredAt.toISOString();
  if ('expiresAt' in event) {
    data['expiresAt'] = event.expiresAt.toISOString();
  }
  return data;
}
