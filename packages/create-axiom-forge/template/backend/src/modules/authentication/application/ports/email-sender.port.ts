import type { OutboundEmail } from '../types/outbound-email.types';

export type EmailSenderErrorCode =
  'INVALID_MESSAGE' | 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE';

export class EmailSenderError extends Error {
  public readonly code: EmailSenderErrorCode;

  public constructor(code: EmailSenderErrorCode) {
    super(`Email sender failed: ${code}`);
    this.name = 'EmailSenderError';
    this.code = code;
  }
}

export interface EmailSenderPort {
  send(outboundEmail: OutboundEmail): Promise<void>;
}
