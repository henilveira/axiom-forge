import {
  DEFAULT_EMAIL_LIST_LIMIT,
  EMAIL_LIST_CURSOR_PATTERN,
  MAX_EMAIL_LIST_CURSOR_LENGTH,
  MAX_EMAIL_LIST_LIMIT,
  MIN_EMAIL_LIST_LIMIT,
} from '../../application/ports/email-reader.constants';
import type { EmailSentListQuery } from '../../application/ports/email-reader.port';

export function parseEmailDiagnosticsQuery(value: unknown): EmailSentListQuery {
  const query = asRecord(value);
  const limit = parseLimit(query['limit']);
  const after = parseCursor(query['after']);
  const before = parseCursor(query['before']);
  if (after !== undefined && before !== undefined) {
    throw new TypeError('email-diagnostics-cursors-mutually-exclusive');
  }
  return {
    limit,
    ...(after === undefined ? {} : { after }),
    ...(before === undefined ? {} : { before }),
  };
}

function parseLimit(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_EMAIL_LIST_LIMIT;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new TypeError('email-diagnostics-limit-invalid');
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_EMAIL_LIST_LIMIT ||
    parsed > MAX_EMAIL_LIST_LIMIT
  ) {
    throw new TypeError('email-diagnostics-limit-invalid');
  }
  return parsed;
}

function parseCursor(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_EMAIL_LIST_CURSOR_LENGTH ||
    !EMAIL_LIST_CURSOR_PATTERN.test(value)
  ) {
    throw new TypeError('email-diagnostics-cursor-invalid');
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError('email-diagnostics-query-invalid');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
