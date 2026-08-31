import type {
  EmailSentListQuery,
  EmailSentReaderPort,
  SentEmailList,
  SentEmailMetadata,
} from '../../application/ports/email-reader.port';
import {
  DEFAULT_EMAIL_LIST_LIMIT,
  EMAIL_LIST_CURSOR_PATTERN,
  MAX_EMAIL_LIST_CURSOR_LENGTH,
  MAX_EMAIL_LIST_LIMIT,
  MIN_EMAIL_LIST_LIMIT,
} from '../../application/ports/email-reader.constants';
import {
  RESEND_API_BASE_URL,
  RESEND_CLIENT_ERROR_STATUS,
  RESEND_EMAIL_READ_TIMEOUT_MS,
  RESEND_SERVER_ERROR_STATUS,
  RESEND_SUCCESS_STATUS_MAX,
  RESEND_SUCCESS_STATUS_MIN,
} from './email-sender.constants';
import {
  ResendEmailReaderError,
  type NormalizedEmailListQuery,
  type ResendEmailReaderHttpClient,
} from './resend-email-reader.types';

const RESEND_READ_TIMEOUT_SENTINEL = Symbol('resend-email-reader-timeout');

export class ResendEmailReaderAdapter implements EmailSentReaderPort {
  public constructor(
    private readonly configuration: Readonly<{ apiKey: string }>,
    private readonly client: ResendEmailReaderHttpClient = new FetchResendEmailReaderHttpClient(),
  ) {}

  public async listSentEmails(
    query: EmailSentListQuery,
  ): Promise<SentEmailList> {
    const normalizedQuery = normalizeEmailListQuery(query);
    let payload: unknown;
    try {
      payload = await this.client.listEmails(
        this.configuration.apiKey,
        normalizedQuery,
      );
    } catch (error: unknown) {
      if (error instanceof ResendEmailReaderError) {
        throw error;
      }
      throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
    }
    return parseSentEmailList(payload);
  }
}

class FetchResendEmailReaderHttpClient implements ResendEmailReaderHttpClient {
  public async listEmails(
    apiKey: string,
    query: NormalizedEmailListQuery,
  ): Promise<unknown> {
    const url = new URL(`${RESEND_API_BASE_URL}/emails`);
    url.searchParams.set('limit', String(query.limit));
    if (query.after !== undefined) {
      url.searchParams.set('after', query.after);
    }
    if (query.before !== undefined) {
      url.searchParams.set('before', query.before);
    }
    const signal = AbortSignal.timeout(RESEND_EMAIL_READ_TIMEOUT_MS);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const deadlinePromise = new Promise<typeof RESEND_READ_TIMEOUT_SENTINEL>(
      (resolve) => {
        deadline = setTimeout(() => {
          resolve(RESEND_READ_TIMEOUT_SENTINEL);
        }, RESEND_EMAIL_READ_TIMEOUT_MS);
      },
    );
    try {
      const response = await Promise.race([
        fetch(url.toString(), {
          method: 'GET',
          headers: { ['Authorization']: `Bearer ${apiKey}` },
          signal,
        }),
        deadlinePromise,
      ]);
      if (response === RESEND_READ_TIMEOUT_SENTINEL) {
        throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
      }
      if (
        response.status < RESEND_SUCCESS_STATUS_MIN ||
        response.status >= RESEND_SUCCESS_STATUS_MAX
      ) {
        throw new ResendEmailReaderError(
          classifyProviderFailure(response.status),
        );
      }
      return await response.json();
    } finally {
      if (deadline !== undefined) {
        clearTimeout(deadline);
      }
    }
  }
}

function classifyProviderFailure(
  statusCode: number,
): 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE' {
  return statusCode >= RESEND_CLIENT_ERROR_STATUS &&
    statusCode < RESEND_SERVER_ERROR_STATUS
    ? 'PROVIDER_REJECTED'
    : 'PROVIDER_UNAVAILABLE';
}

function normalizeEmailListQuery(
  query: EmailSentListQuery,
): NormalizedEmailListQuery {
  const limit = query.limit ?? DEFAULT_EMAIL_LIST_LIMIT;
  if (
    !Number.isSafeInteger(limit) ||
    limit < MIN_EMAIL_LIST_LIMIT ||
    limit > MAX_EMAIL_LIST_LIMIT
  ) {
    throw new ResendEmailReaderError('INVALID_QUERY');
  }
  if (query.after !== undefined && query.before !== undefined) {
    throw new ResendEmailReaderError('INVALID_QUERY');
  }
  validateCursor(query.after);
  validateCursor(query.before);
  return {
    limit,
    ...(query.after === undefined ? {} : { after: query.after }),
    ...(query.before === undefined ? {} : { before: query.before }),
  };
}

function validateCursor(cursor: string | undefined): void {
  if (
    cursor !== undefined &&
    (cursor.length === 0 ||
      cursor.length > MAX_EMAIL_LIST_CURSOR_LENGTH ||
      !EMAIL_LIST_CURSOR_PATTERN.test(cursor))
  ) {
    throw new ResendEmailReaderError('INVALID_QUERY');
  }
}

function parseSentEmailList(payload: unknown): SentEmailList {
  if (!isRecord(payload) || payload['object'] !== 'list') {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  const hasMore = payload['has_more'];
  const entries = payload['data'];
  if (typeof hasMore !== 'boolean' || !Array.isArray(entries)) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  return {
    object: 'list',
    hasMore,
    data: entries.map(parseSentEmailMetadata),
  };
}

function parseSentEmailMetadata(value: unknown): SentEmailMetadata {
  if (!isRecord(value)) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  const id = requiredText(value['id']);
  const to = parseRecipients(value['to']);
  const from = requiredText(value['from']);
  const createdAt = requiredTimestamp(value['created_at']);
  const subject = requiredText(value['subject']);
  const lastEvent = value['last_event'];
  if (
    lastEvent === undefined ||
    (lastEvent != null && typeof lastEvent !== 'string')
  ) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  return {
    id,
    to,
    from,
    createdAt,
    subject,
    lastEvent,
  };
}

function parseRecipients(value: unknown): ReadonlyArray<string> {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((recipient) => typeof recipient !== 'string')
  ) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  return value.map((recipient) => requiredText(recipient));
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  return value.trim();
}

function requiredTimestamp(value: unknown): string {
  const timestamp = requiredText(value);
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new ResendEmailReaderError('PROVIDER_UNAVAILABLE');
  }
  return timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
