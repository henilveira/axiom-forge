export const MESSAGING_LIFECYCLE_EVENTS = [
  'stored',
  'published',
  'received',
  'processed',
  'duplicate',
  'retry_scheduled',
  'rejected',
  'dead_lettered',
] as const;

export const MESSAGING_LIFECYCLE_FIELDS = new Set([
  'eventId',
  'eventType',
  'eventVersion',
  'messageId',
  'correlationId',
  'causationId',
  'producer',
  'consumer',
  'exchange',
  'routingKey',
  'tenantId',
  'attempt',
  'outcome',
  'durationMs',
  'occurredAt',
  'recordedAt',
  'errorCode',
]);

export const MESSAGING_MAX_ERROR_CODE_LENGTH = 64;
