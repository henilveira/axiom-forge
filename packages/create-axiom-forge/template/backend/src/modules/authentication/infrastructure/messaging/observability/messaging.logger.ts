import { Logger } from '@nestjs/common';
import type { AuthenticationLoggerPort } from '../../../application/ports/logger.port';
import {
  MESSAGING_LIFECYCLE_EVENTS,
  MESSAGING_LIFECYCLE_FIELDS,
  MESSAGING_MAX_ERROR_CODE_LENGTH,
} from './messaging.logger.constants';
import type {
  MessagingLogMetadata,
  MessagingLogValue,
} from './messaging.logger.types';

export class StructuredMessagingLogger implements AuthenticationLoggerPort {
  private readonly logger = new Logger('AuthenticationMessaging');

  public info(event: string, metadata: MessagingLogMetadata): void {
    this.logger.log(
      JSON.stringify(sanitizeLifecycleRecord(event, { ...metadata })),
    );
  }

  public warn(event: string, metadata: MessagingLogMetadata): void {
    this.logger.warn(
      JSON.stringify(sanitizeLifecycleRecord(event, { ...metadata })),
    );
  }
}

export function sanitizeLifecycleRecord(
  event: string,
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, MessagingLogValue>> {
  const safeEvent = isLifecycleEvent(event) ? event : 'rejected';
  const record: Record<string, MessagingLogValue> = {
    event: safeEvent,
  };
  for (const [key, value] of Object.entries(metadata)) {
    if (!MESSAGING_LIFECYCLE_FIELDS.has(key)) {
      continue;
    }
    if (key === 'errorCode') {
      record[key] = sanitizeErrorCode(value);
    } else if (isMessagingLogValue(value)) {
      record[key] = value;
    }
  }
  return record;
}

function isLifecycleEvent(value: string): boolean {
  return MESSAGING_LIFECYCLE_EVENTS.some((event) => event === value);
}

function sanitizeErrorCode(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MESSAGING_MAX_ERROR_CODE_LENGTH ||
    !/^[A-Z0-9_]+$/.test(value)
  ) {
    return value == null ? null : 'UNKNOWN';
  }
  return value;
}

function isMessagingLogValue(value: unknown): value is MessagingLogValue {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
