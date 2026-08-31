import type { IntegrationEventEnvelope } from '../../../application/ports/messaging.types';
import {
  AUTHENTICATION_ENVELOPE_PART_COUNT,
  AUTHENTICATION_EVENT_PRODUCER,
  AUTHENTICATION_EVENT_TYPE_PREFIX,
  AUTHENTICATION_EVENT_NAME_INDEX,
  AUTHENTICATION_EVENT_VERSION,
  AUTHENTICATION_EVENT_VERSION_INDEX,
  AUTHENTICATION_MAX_IDENTIFIER_LENGTH,
  AUTHENTICATION_SCHEMA_VERSION,
} from './event.constants';
import {
  isSafeEventData,
  isSupportedAuthenticationEventType,
} from './authentication-event.schema';

type EnvelopeCandidate = {
  readonly messageId: string | null;
  readonly eventId: string | null;
  readonly eventType: string | null;
  readonly eventVersion: number | null;
  readonly schemaVersion: number | null;
  readonly occurredAt: string | null;
  readonly producer: unknown;
  readonly correlationId: string | null;
  readonly causationId: string | null | undefined;
  readonly tenantId: string | null | undefined;
  readonly data: unknown;
};

type ValidEnvelope = {
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
};

export function parseAuthenticationEnvelope(
  value: unknown,
): IntegrationEventEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }
  const messageId = readIdentifier(value['messageId']);
  const eventId = readIdentifier(value['eventId']);
  const eventType = readEventType(value['eventType']);
  const eventVersion = readPositiveInteger(value['eventVersion']);
  const schemaVersion = readPositiveInteger(value['schemaVersion']);
  const occurredAt = readTimestamp(value['occurredAt']);
  const producer = value['producer'];
  const correlationId = readIdentifier(value['correlationId']);
  const causationId = readNullableIdentifier(value['causationId']);
  const tenantId = readNullableIdentifier(value['tenantId']);
  if (
    !isValidEnvelope({
      messageId,
      eventId,
      eventType,
      eventVersion,
      schemaVersion,
      occurredAt,
      producer,
      correlationId,
      causationId,
      tenantId,
      data: value['data'],
    })
  ) {
    return null;
  }
  return toEnvelope({
    messageId,
    eventId,
    eventType,
    eventVersion,
    schemaVersion,
    occurredAt,
    producer,
    correlationId,
    causationId,
    tenantId,
    data: value['data'],
  });
}

function readEventType(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parts = value.split('.');
  const eventName = parts.at(AUTHENTICATION_EVENT_NAME_INDEX);
  const version = parts.at(AUTHENTICATION_EVENT_VERSION_INDEX);
  return value.startsWith(`${AUTHENTICATION_EVENT_TYPE_PREFIX}.`) &&
    parts.length === AUTHENTICATION_ENVELOPE_PART_COUNT &&
    eventName !== undefined &&
    version === `v${AUTHENTICATION_EVENT_VERSION}` &&
    isSupportedAuthenticationEventType(eventName)
    ? value
    : null;
}

function readIdentifier(value: unknown): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= AUTHENTICATION_MAX_IDENTIFIER_LENGTH
    ? value
    : null;
}

function readNullableIdentifier(value: unknown): string | null | undefined {
  if (value == null) {
    return value;
  }
  return readIdentifier(value) ?? undefined;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function readTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function isValidEnvelope(value: EnvelopeCandidate): value is ValidEnvelope {
  return (
    value.messageId != null &&
    value.eventId != null &&
    value.eventType != null &&
    value.eventVersion === AUTHENTICATION_EVENT_VERSION &&
    value.schemaVersion === AUTHENTICATION_SCHEMA_VERSION &&
    value.occurredAt != null &&
    value.producer === AUTHENTICATION_EVENT_PRODUCER &&
    value.correlationId != null &&
    value.causationId !== undefined &&
    value.tenantId !== undefined &&
    isSafeEventData(value.data, eventNameFromType(value.eventType))
  );
}

function eventNameFromType(value: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  return value.split('.').at(AUTHENTICATION_EVENT_NAME_INDEX);
}

function toEnvelope(value: EnvelopeCandidate): IntegrationEventEnvelope {
  if (!isValidEnvelope(value)) {
    throw new Error('invalid-authentication-envelope');
  }
  return {
    messageId: value.messageId,
    eventId: value.eventId,
    eventType: value.eventType,
    eventVersion: value.eventVersion,
    schemaVersion: value.schemaVersion,
    occurredAt: value.occurredAt,
    producer: AUTHENTICATION_EVENT_PRODUCER,
    correlationId: value.correlationId,
    causationId: value.causationId ?? null,
    tenantId: value.tenantId ?? null,
    data: value.data,
  };
}
