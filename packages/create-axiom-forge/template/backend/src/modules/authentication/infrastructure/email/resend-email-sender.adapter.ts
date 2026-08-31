import type {
  EmailSenderPort,
  EmailSenderErrorCode,
} from '../../application/ports/email-sender.port';
import { EmailSenderError } from '../../application/ports/email-sender.port';
import type { OutboundEmail } from '../../application/types/outbound-email.types';
import type {
  ResendEmailHttpClient,
  ResendEmailPayload,
} from './resend-email-sender.types';
import {
  EMAIL_DOMAIN_SEPARATOR,
  MAX_OUTBOUND_EMAIL_RECIPIENTS,
  MAX_OUTBOUND_EMAIL_SUBJECT_LENGTH,
  MIN_EMAIL_DOMAIN_PART_LENGTH,
  MIN_EMAIL_LOCAL_PART_LENGTH,
  RESEND_API_BASE_URL,
  RESEND_CLIENT_ERROR_STATUS,
  RESEND_SUCCESS_STATUS_MAX,
  RESEND_SUCCESS_STATUS_MIN,
  RESEND_SERVER_ERROR_STATUS,
} from './email-sender.constants';

export class ResendEmailSenderAdapter implements EmailSenderPort {
  public constructor(
    private readonly configuration: Readonly<{
      apiKey: string;
      from: string;
    }>,
    private readonly client: ResendEmailHttpClient = new FetchResendEmailHttpClient(),
  ) {}

  public async send(outboundEmail: OutboundEmail): Promise<void> {
    const payload = createResendPayload(outboundEmail, this.configuration.from);
    let statusCode: number;
    try {
      statusCode = await this.client.sendEmail(
        this.configuration.apiKey,
        payload,
      );
    } catch {
      throw new EmailSenderError('PROVIDER_UNAVAILABLE');
    }
    if (!isSuccessfulStatus(statusCode)) {
      throw new EmailSenderError(classifyProviderFailure(statusCode));
    }
  }
}

class FetchResendEmailHttpClient implements ResendEmailHttpClient {
  public async sendEmail(
    apiKey: string,
    payload: Readonly<ResendEmailPayload>,
  ): Promise<number> {
    const response = await fetch(`${RESEND_API_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        ['Authorization']: `Bearer ${apiKey}`,
        ['Content-Type']: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.status;
  }
}

function createResendPayload(
  outboundEmail: OutboundEmail,
  configuredFrom: string,
): ResendEmailPayload {
  validateFrom(outboundEmail.from, configuredFrom);
  const recipients = normalizeRecipients(outboundEmail.to);
  const subject = validateSubject(outboundEmail.subject);
  const content = validateContent(outboundEmail);
  const basePayload = {
    from: configuredFrom,
    to: recipients,
    subject,
  };
  if (content.text !== undefined && content.html !== undefined) {
    return { ...basePayload, text: content.text, html: content.html };
  }
  if (content.text !== undefined) {
    return { ...basePayload, text: content.text };
  }
  if (content.html !== undefined) {
    return { ...basePayload, html: content.html };
  }
  throw new EmailSenderError('INVALID_MESSAGE');
}

function validateFrom(actual: string, configured: string): void {
  if (actual !== configured || extractMailbox(configured) == null) {
    throw new EmailSenderError('INVALID_MESSAGE');
  }
}

function normalizeRecipients(
  recipients: string | ReadonlyArray<string>,
): string | string[] {
  const values =
    typeof recipients === 'string' ? [recipients] : [...recipients];
  if (
    values.length === 0 ||
    values.length > MAX_OUTBOUND_EMAIL_RECIPIENTS ||
    values.some((recipient) => extractMailbox(recipient) == null)
  ) {
    throw new EmailSenderError('INVALID_MESSAGE');
  }
  return typeof recipients === 'string' ? recipients : values;
}

function validateSubject(subject: string): string {
  const value = subject.trim();
  if (
    value.length === 0 ||
    value.length > MAX_OUTBOUND_EMAIL_SUBJECT_LENGTH ||
    value.includes('\r') ||
    value.includes('\n')
  ) {
    throw new EmailSenderError('INVALID_MESSAGE');
  }
  return value;
}

function validateContent(
  outboundEmail: OutboundEmail,
): Readonly<{ text?: string; html?: string }> {
  const text = normalizeContent(outboundEmail.text);
  const html = normalizeContent(outboundEmail.html);
  if (text === undefined && html === undefined) {
    throw new EmailSenderError('INVALID_MESSAGE');
  }
  return {
    ...(text === undefined ? {} : { text }),
    ...(html === undefined ? {} : { html }),
  };
}

function normalizeContent(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.length === 0 ? undefined : value;
}

function extractMailbox(value: string): string | null {
  const trimmed = value.trim();
  const opening = trimmed.lastIndexOf('<');
  const closing = trimmed.lastIndexOf('>');
  if (opening === -1 && closing === -1) {
    return isValidMailbox(trimmed) ? trimmed : null;
  }
  if (
    opening <= 0 ||
    closing !== trimmed.length - 1 ||
    trimmed.indexOf('<') !== opening ||
    trimmed.indexOf('>') !== closing ||
    trimmed.includes('\r') ||
    trimmed.includes('\n')
  ) {
    return null;
  }
  const mailbox = trimmed.slice(opening + 1, closing).trim();
  return isValidMailbox(mailbox) ? mailbox : null;
}

function isValidMailbox(value: string): boolean {
  const atIndex = value.indexOf('@');
  const localPart = atIndex > 0 ? value.slice(0, atIndex) : '';
  const domainPart = atIndex > 0 ? value.slice(atIndex + 1) : '';
  const domainSeparator = domainPart.lastIndexOf(EMAIL_DOMAIN_SEPARATOR);
  return (
    localPart.length >= MIN_EMAIL_LOCAL_PART_LENGTH &&
    domainPart.length >= MIN_EMAIL_DOMAIN_PART_LENGTH &&
    domainSeparator > 0 &&
    domainPart.length - domainSeparator > MIN_EMAIL_DOMAIN_PART_LENGTH - 1 &&
    atIndex === value.lastIndexOf('@') &&
    !value.includes(' ') &&
    !value.includes('\r') &&
    !value.includes('\n') &&
    !value.includes('<') &&
    !value.includes('>')
  );
}

function classifyProviderFailure(statusCode: number): EmailSenderErrorCode {
  if (
    statusCode >= RESEND_CLIENT_ERROR_STATUS &&
    statusCode < RESEND_SERVER_ERROR_STATUS
  ) {
    return 'PROVIDER_REJECTED';
  }
  return 'PROVIDER_UNAVAILABLE';
}

function isSuccessfulStatus(statusCode: number): boolean {
  return (
    Number.isInteger(statusCode) &&
    statusCode >= RESEND_SUCCESS_STATUS_MIN &&
    statusCode < RESEND_SUCCESS_STATUS_MAX
  );
}
