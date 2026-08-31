import type { EmailSentListQuery } from '../../application/ports/email-reader.port';

export type NormalizedEmailListQuery = Readonly<
  Required<Pick<EmailSentListQuery, 'limit'>> &
    Omit<EmailSentListQuery, 'limit'>
>;

export type ResendEmailReaderErrorCode =
  'INVALID_QUERY' | 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE';

export class ResendEmailReaderError extends Error {
  public readonly code: ResendEmailReaderErrorCode;

  public constructor(code: ResendEmailReaderErrorCode) {
    super(`Resend email reader failed: ${code}`);
    this.name = 'ResendEmailReaderError';
    this.code = code;
  }
}

export interface ResendEmailReaderHttpClient {
  listEmails(apiKey: string, query: NormalizedEmailListQuery): Promise<unknown>;
}
