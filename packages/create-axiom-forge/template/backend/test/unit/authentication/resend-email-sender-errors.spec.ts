import { ResendEmailSenderAdapter } from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.adapter';
import type {
  ResendEmailHttpClient,
  ResendEmailPayload,
} from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.types';

const configuration = {
  apiKey: 're_test-key',
  from: 'Example App <no-reply@example.com>',
};

function clientFor(
  send: (payload: ResendEmailPayload) => Promise<number>,
): ResendEmailHttpClient {
  return { sendEmail: (_apiKey, payload) => send(payload) };
}

describe('ResendEmailSenderAdapter failure classification', () => {
  it.each([
    [400, 'PROVIDER_REJECTED'],
    [429, 'PROVIDER_REJECTED'],
    [499, 'PROVIDER_REJECTED'],
    [500, 'PROVIDER_UNAVAILABLE'],
    [503, 'PROVIDER_UNAVAILABLE'],
    [0, 'PROVIDER_UNAVAILABLE'],
  ])(
    'classifies Resend status %s as %s without exposing provider response',
    async (statusCode, expectedCode) => {
      const sender = createSenderWithResponse(statusCode);

      await expect(
        sender.send({
          to: 'person@example.com',
          from: configuration.from,
          subject: 'Subject',
          text: 'Text',
        }),
      ).rejects.toMatchObject({
        name: 'EmailSenderError',
        code: expectedCode,
        message: `Email sender failed: ${expectedCode}`,
      });
    },
  );
});

describe('ResendEmailSenderAdapter message boundary', () => {
  it.each([
    {
      name: 'recipient header injection',
      email: {
        to: 'person@example.com\r\nBcc:other@example.com',
        from: configuration.from,
        subject: 'Subject',
        text: 'Text',
      },
    },
    {
      name: 'subject header injection',
      email: {
        to: 'person@example.com',
        from: configuration.from,
        subject: 'Subject\nBcc:other@example.com',
        text: 'Text',
      },
    },
    {
      name: 'empty content',
      email: {
        to: 'person@example.com',
        from: configuration.from,
        subject: 'Subject',
      },
    },
  ])('rejects an invalid outbound message: $name', async ({ email }) => {
    const send = jest.fn(() => Promise.resolve(200));
    const sender = new ResendEmailSenderAdapter(configuration, clientFor(send));

    await expect(sender.send(email)).rejects.toMatchObject({
      name: 'EmailSenderError',
      code: 'INVALID_MESSAGE',
    });
    expect(send).not.toHaveBeenCalled();
  });
});

function createSenderWithResponse(
  statusCode: number,
): ResendEmailSenderAdapter {
  return new ResendEmailSenderAdapter(
    configuration,
    clientFor(() => Promise.resolve(statusCode)),
  );
}
