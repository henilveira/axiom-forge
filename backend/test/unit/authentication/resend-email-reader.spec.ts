import { ResendEmailReaderAdapter } from '../../../src/modules/authentication/infrastructure/email/resend-email-reader.adapter';
import type { ResendEmailReaderHttpClient } from '../../../src/modules/authentication/infrastructure/email/resend-email-reader.types';

const providerPayload = {
  object: 'list',
  has_more: true,
  data: [
    {
      id: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
      to: ['person@example.com'],
      from: 'Example App <henrique@example.com>',
      created_at: '2026-08-28 12:00:00.000000+00',
      subject: 'Seu link de acesso à Example App',
      last_event: 'queued',
      body: 'must never cross the adapter boundary',
      bcc: ['hidden@example.com'],
      cc: ['copy@example.com'],
      reply_to: ['reply@example.com'],
    },
  ],
};

describe('ResendEmailReaderAdapter sent-email metadata', () => {
  it('lists only sanitized sent-email metadata and applies the default limit', async () => {
    const listEmails = jest.fn<
      ReturnType<ResendEmailReaderHttpClient['listEmails']>,
      Parameters<ResendEmailReaderHttpClient['listEmails']>
    >(() => Promise.resolve(providerPayload));
    const reader = createReader({ listEmails });

    await expect(reader.listSentEmails({})).resolves.toEqual({
      object: 'list',
      hasMore: true,
      data: [
        {
          id: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
          to: ['person@example.com'],
          from: 'Example App <henrique@example.com>',
          createdAt: '2026-08-28 12:00:00.000000+00',
          subject: 'Seu link de acesso à Example App',
          lastEvent: 'queued',
        },
      ],
    });
    expect(listEmails).toHaveBeenCalledWith(
      'read-api-key',
      expect.objectContaining({ limit: 20 }),
    );
    expect(JSON.stringify(await reader.listSentEmails({}))).not.toContain(
      'must never cross the adapter boundary',
    );
  });
});

describe('ResendEmailReaderAdapter query validation', () => {
  it('forwards one bounded cursor and rejects both cursors before calling Resend', async () => {
    const listEmails = jest.fn<
      ReturnType<ResendEmailReaderHttpClient['listEmails']>,
      Parameters<ResendEmailReaderHttpClient['listEmails']>
    >(() => Promise.resolve({ object: 'list', has_more: false, data: [] }));
    const reader = createReader({ listEmails });

    await reader.listSentEmails({ limit: 100, after: 'cursor_01' });
    expect(listEmails).toHaveBeenCalledWith(
      'read-api-key',
      expect.objectContaining({ limit: 100, after: 'cursor_01' }),
    );
    await expect(
      reader.listSentEmails({ after: 'cursor_01', before: 'cursor_02' }),
    ).rejects.toMatchObject({ code: 'INVALID_QUERY' });
    await expect(
      reader.listSentEmails({ after: 'cursor with spaces' }),
    ).rejects.toMatchObject({ code: 'INVALID_QUERY' });
    expect(listEmails).toHaveBeenCalledTimes(1);
  });
});

describe('ResendEmailReaderAdapter provider validation', () => {
  it('sanitizes transport failures and malformed provider payloads', async () => {
    const failedClient: ResendEmailReaderHttpClient = {
      listEmails: () => Promise.reject(new Error('provider body with secret')),
    };
    const failedReader = createReader(failedClient);
    await expect(failedReader.listSentEmails({})).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    await expect(failedReader.listSentEmails({})).rejects.not.toThrow(
      'provider body with secret',
    );

    const malformedClient: ResendEmailReaderHttpClient = {
      listEmails: () =>
        Promise.resolve({
          object: 'list',
          has_more: false,
          data: [{ id: 42 }],
        }),
    };
    await expect(
      createReader(malformedClient).listSentEmails({}),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('rejects a malformed provider timestamp without exposing the payload', async () => {
    const malformedDateClient: ResendEmailReaderHttpClient = {
      listEmails: () =>
        Promise.resolve({
          ...providerPayload,
          data: [{ ...providerPayload.data[0], created_at: 'not-a-date' }],
        }),
    };
    await expect(
      createReader(malformedDateClient).listSentEmails({}),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});

describe('ResendEmailReaderAdapter HTTP transport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the GET Resend endpoint and never sends a request body', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(providerPayload), { status: 200 }),
      );
    const reader = new ResendEmailReaderAdapter({ apiKey: 'read-api-key' });

    await reader.listSentEmails({ limit: 3, before: 'cursor-01' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchSpy.mock.calls[0] ?? [];
    expect(requestUrl).toBe(
      'https://api.resend.com/emails?limit=3&before=cursor-01',
    );
    expect(requestInit).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer read-api-key' },
    });
    expect(requestInit).not.toHaveProperty('body');
  });

  it.each([
    [401, 'PROVIDER_REJECTED'],
    [429, 'PROVIDER_REJECTED'],
    [500, 'PROVIDER_UNAVAILABLE'],
    [503, 'PROVIDER_UNAVAILABLE'],
  ])(
    'classifies provider status %s without exposing its response',
    async (statusCode, code) => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response('provider details', { status: statusCode }),
        );
      const reader = new ResendEmailReaderAdapter({ apiKey: 'read-api-key' });

      await expect(reader.listSentEmails({})).rejects.toMatchObject({
        code,
        message: `Resend email reader failed: ${code}`,
      });
    },
  );
});

function createReader(
  client: ResendEmailReaderHttpClient,
): ResendEmailReaderAdapter {
  return new ResendEmailReaderAdapter({ apiKey: 'read-api-key' }, client);
}
