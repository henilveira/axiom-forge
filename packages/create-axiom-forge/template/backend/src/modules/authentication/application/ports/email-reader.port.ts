export const EMAIL_SENT_READER = Symbol('EMAIL_SENT_READER');

export interface EmailSentListQuery {
  readonly limit?: number;
  readonly after?: string;
  readonly before?: string;
}

export interface SentEmailMetadata {
  readonly id: string;
  readonly to: ReadonlyArray<string>;
  readonly from: string;
  readonly createdAt: string;
  readonly subject: string;
  readonly lastEvent: string | null;
}

export interface SentEmailList {
  readonly object: 'list';
  readonly hasMore: boolean;
  readonly data: ReadonlyArray<SentEmailMetadata>;
}

export interface EmailSentReaderPort {
  listSentEmails(query: EmailSentListQuery): Promise<SentEmailList>;
}
