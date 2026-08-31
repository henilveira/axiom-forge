import { loadDotEnvFile } from '../../../src/infrastructure/config/env';
import { ResendEmailSenderAdapter } from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.adapter';
import { prepareLiveSmoke } from '../../test-kit/resend-live-smoke-guard';

/**
 * Manual-only command (never part of the normal integration gate):
 *
 * NODE_ENV=development AUTH_EMAIL_LIVE_TEST=true \
 * AUTH_EMAIL_SMOKE_RECIPIENT='operator@example.com' \
 * node --env-file=.env ./node_modules/jest/bin/jest.js \
 *   --config ./test/jest-integration.json \
 *   test/integration/authentication/resend-live-email.integration.spec.ts
 *
 * The explicit flag and recipient are intentional. The test does not use a
 * fixture or a default mailbox, and does not run while NODE_ENV=test.
 */

const liveTestRequested = process.env['AUTH_EMAIL_LIVE_TEST'] === 'true';

// Jest does not load the application .env bootstrap. Load it only for an
// explicitly requested live run; normal tests never read local credentials.
if (liveTestRequested) {
  loadDotEnvFile();
}

const liveSetup = prepareLiveSmoke(process.env);
const liveDescribe = liveSetup.enabled ? describe : describe.skip;

liveDescribe('Resend live e-mail delivery smoke', () => {
  jest.setTimeout(45_000);

  it('sends through the real adapter and finds the message in Resend sent mail', async () => {
    if (
      liveSetup.error !== undefined ||
      liveSetup.configuration === undefined
    ) {
      throw new Error(liveSetup.error ?? 'live e-mail smoke is not configured');
    }
    const recipient = liveSetup.recipient;
    if (recipient === undefined) {
      throw new Error('AUTH_EMAIL_SMOKE_RECIPIENT is required');
    }

    const startedAt = new Date();
    const subject = `Example App live e-mail smoke ${startedAt.toISOString()}`;
    const sender = new ResendEmailSenderAdapter({
      apiKey: liveSetup.configuration.resendApiKey,
      from: liveSetup.configuration.emailFrom,
    });
    const reader = createResendReader(
      process.env['RESEND_EMAILS_READ_API_KEY']?.trim() ||
        liveSetup.configuration.resendApiKey,
    );

    await sender.send({
      to: recipient,
      from: liveSetup.configuration.emailFrom,
      subject,
      text: [
        'Example App e-mail delivery smoke test.',
        '',
        'This is a synthetic magic-link-shaped message.',
        'It intentionally contains no authentication token.',
      ].join('\n'),
      html: [
        '<p>Example App e-mail delivery smoke test.</p>',
        '<p>This is a synthetic magic-link-shaped message.</p>',
        '<p>It intentionally contains no authentication token.</p>',
      ].join(''),
    });

    const sentEmail = await pollForSentEmail({
      reader,
      recipient,
      subject,
      notBefore: startedAt,
    });

    expect(sentEmail.id).not.toHaveLength(0);
    expect(sentEmail.subject).toBe(subject);
    expect(sentEmail.lastEvent === null || sentEmail.lastEvent.length > 0).toBe(
      true,
    );
    expect(Date.parse(sentEmail.createdAt)).toBeGreaterThanOrEqual(
      startedAt.getTime() - 5_000,
    );
  });
});

interface EmailSentReaderPort {
  listSentEmails(query: { readonly limit: number }): Promise<{
    readonly data: readonly SentEmailMetadata[];
  }>;
}

interface SentEmailMetadata {
  readonly id: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly createdAt: string;
  readonly lastEvent: string | null;
}

function createResendReader(apiKey: string): EmailSentReaderPort {
  const readerModule: unknown = jest.requireActual<unknown>(
    '../../../src/modules/authentication/infrastructure/email/resend-email-reader.adapter',
  );
  if (!isResendReaderModule(readerModule)) {
    throw new Error('Resend e-mail reader adapter is unavailable');
  }
  return new readerModule.ResendEmailReaderAdapter({ apiKey });
}

async function pollForSentEmail(input: {
  readonly reader: EmailSentReaderPort;
  readonly recipient: string;
  readonly subject: string;
  readonly notBefore: Date;
}): Promise<SentEmailMetadata> {
  const deadline = Date.now() + 30_000;
  do {
    let page;
    try {
      page = await input.reader.listSentEmails({ limit: 100 });
    } catch {
      throw new Error('Resend sent-mail list request was unavailable');
    }
    const match = page.data.find(
      (email) =>
        email.subject === input.subject &&
        email.to.includes(input.recipient) &&
        Date.parse(email.createdAt) >= input.notBefore.getTime() - 5_000,
    );
    if (match !== undefined) {
      return match;
    }
    await wait(2_000);
  } while (Date.now() < deadline);

  throw new Error(
    'Resend accepted the smoke message but it did not appear in sent mail before timeout',
  );
}

interface ResendReaderConstructor {
  new (configuration: Readonly<{ apiKey: string }>): EmailSentReaderPort;
}

function isResendReaderModule(
  value: unknown,
): value is { readonly ResendEmailReaderAdapter: ResendReaderConstructor } {
  return (
    isRecord(value) && typeof value['ResendEmailReaderAdapter'] === 'function'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
