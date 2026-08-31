import { ResendEmailSenderAdapter } from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.adapter';
import type {
  ResendEmailHttpClient,
  ResendEmailPayload,
} from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.types';
import { RESEND_API_BASE_URL } from '../../../src/modules/authentication/infrastructure/email/email-sender.constants';

function clientFor(
  send: (payload: ResendEmailPayload) => Promise<number>,
): ResendEmailHttpClient {
  return { sendEmail: (_apiKey, payload) => send(payload) };
}

describe('ResendEmailSenderAdapter', () => {
  const configuration = {
    apiKey: 're_test-key',
    from: 'Example App <no-reply@example.com>',
  };

  it('sends a complete outbound email through the fixed HTTP transport', async () => {
    const sent: ResendEmailPayload[] = [];
    const sender = new ResendEmailSenderAdapter(
      configuration,
      clientFor((payload) => {
        sent.push(payload);
        return Promise.resolve(200);
      }),
    );

    await sender.send({
      to: 'person@example.com',
      from: configuration.from,
      subject: 'Confirm your e-mail',
      text: 'Open the link.',
      html: '<p>Open the link.</p>',
      metadata: { category: 'EMAIL_VERIFICATION' },
    });

    expect(sent).toEqual([
      {
        from: configuration.from,
        to: 'person@example.com',
        subject: 'Confirm your e-mail',
        text: 'Open the link.',
        html: '<p>Open the link.</p>',
      },
    ]);
  });

  it('classifies provider responses without exposing provider details', async () => {
    const sender = new ResendEmailSenderAdapter(
      configuration,
      clientFor(() => Promise.resolve(422)),
    );

    await expect(
      sender.send({
        to: 'person@example.com',
        from: configuration.from,
        subject: 'Subject',
        text: 'Text',
      }),
    ).rejects.toMatchObject({
      name: 'EmailSenderError',
      code: 'PROVIDER_REJECTED',
      message: 'Email sender failed: PROVIDER_REJECTED',
    });
  });

  it('classifies network failures without forwarding the thrown error', async () => {
    const sender = new ResendEmailSenderAdapter(
      configuration,
      clientFor(() =>
        Promise.reject(new Error('network detail must stay private')),
      ),
    );

    await expect(
      sender.send({
        to: 'person@example.com',
        from: configuration.from,
        subject: 'Subject',
        text: 'Text',
      }),
    ).rejects.toMatchObject({
      name: 'EmailSenderError',
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Email sender failed: PROVIDER_UNAVAILABLE',
    });
  });

  it('rejects a message with a sender different from the configured sender', async () => {
    const send = jest.fn(() => Promise.resolve(200));
    const sender = new ResendEmailSenderAdapter(configuration, clientFor(send));

    await expect(
      sender.send({
        to: 'person@example.com',
        from: 'other@example.com',
        subject: 'Subject',
        text: 'Text',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Resend HTTP endpoint and logging boundary', () => {
  it('pins the endpoint and does not log provider responses', async () => {
    const originalBaseUrl = process.env['RESEND_BASE_URL'];
    process.env['RESEND_BASE_URL'] = 'https://attacker.invalid/collect';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'email-1',
          error: 'recipient@example.com provider detail',
        }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const sender = new ResendEmailSenderAdapter({
        apiKey: 're_test-key',
        from: 'Example App <no-reply@example.com>',
      });
      await expect(
        sender.send({
          to: 'person@example.com',
          from: 'Example App <no-reply@example.com>',
          subject: 'Subject',
          text: 'Text',
        }),
      ).rejects.toMatchObject({ code: 'PROVIDER_REJECTED' });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${RESEND_API_BASE_URL}/emails`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer re_test-key',
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      if (originalBaseUrl === undefined) {
        delete process.env['RESEND_BASE_URL'];
      } else {
        process.env['RESEND_BASE_URL'] = originalBaseUrl;
      }
    }
  });
});
