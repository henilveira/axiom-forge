import { EmailSenderError } from '../../../src/modules/authentication/application/ports/email-sender.port';
import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import { scheduleAuthenticationEmailDelivery } from '../../../src/modules/authentication/application/handlers/email-delivery.handler';
import { ResendEmailSenderAdapter } from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.adapter';
import type { ResendEmailHttpClient } from '../../../src/modules/authentication/infrastructure/email/resend-email-sender.types';
import { RESEND_API_BASE_URL } from '../../../src/modules/authentication/infrastructure/email/email-sender.constants';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import type { AuthenticationLogMetadata } from '../../../src/modules/authentication/application/ports/logger.port';

const NOW = new Date('2026-08-28T12:00:00.000Z');
const CHALLENGE_ID = '00000000-0000-4000-8000-000000000801';
const USER_ID = '00000000-0000-4000-8000-000000000802';
const SENSITIVE_RESPONSE =
  'provider body person@example.com token=raw-token Authorization: Bearer raw-api-key';

class RecordingLogger implements AuthenticationLoggerPort {
  public readonly infoRecords: AuthenticationLogMetadata[] = [];
  public readonly warnRecords: AuthenticationLogMetadata[] = [];

  public info(_event: string, metadata: AuthenticationLogMetadata): void {
    this.infoRecords.push(metadata);
  }

  public warn(_event: string, metadata: AuthenticationLogMetadata): void {
    this.warnRecords.push(metadata);
  }
}

describe('AUTH-BE-T17 Resend transport regressions', () => {
  it('pins the HTTP endpoint and never logs body, Authorization, API key, or provider detail', async () => {
    const originalBaseUrl = process.env['RESEND_BASE_URL'];
    process.env['RESEND_BASE_URL'] = 'https://attacker.invalid/collect';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: SENSITIVE_RESPONSE }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const consoleSpies = (
      ['debug', 'info', 'log', 'warn', 'error'] as const
    ).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );

    try {
      const sender = new ResendEmailSenderAdapter({
        apiKey: 're_test-sensitive-api-key',
        from: 'Example App <no-reply@example.com>',
      });
      let thrown: unknown;
      try {
        await sender.send({
          to: 'person@example.com',
          from: 'Example App <no-reply@example.com>',
          subject: 'Subject',
          text: 'token=raw-token body must never be logged',
        });
      } catch (error: unknown) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        name: 'EmailSenderError',
        code: 'PROVIDER_REJECTED',
        message: 'Email sender failed: PROVIDER_REJECTED',
      });
      expect(String(thrown)).not.toContain(SENSITIVE_RESPONSE);
      expect(JSON.stringify(thrown)).not.toContain(SENSITIVE_RESPONSE);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${RESEND_API_BASE_URL}/emails`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer re_test-sensitive-api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
      for (const consoleSpy of consoleSpies) {
        expect(consoleSpy).not.toHaveBeenCalled();
      }
    } finally {
      fetchSpy.mockRestore();
      for (const consoleSpy of consoleSpies) {
        consoleSpy.mockRestore();
      }
      if (originalBaseUrl === undefined) {
        delete process.env['RESEND_BASE_URL'];
      } else {
        process.env['RESEND_BASE_URL'] = originalBaseUrl;
      }
    }
  });
});

describe('AUTH-BE-T17 Resend status regressions', () => {
  it.each([
    [400, 'PROVIDER_REJECTED'],
    [429, 'PROVIDER_REJECTED'],
    [499, 'PROVIDER_REJECTED'],
    [500, 'PROVIDER_UNAVAILABLE'],
    [503, 'PROVIDER_UNAVAILABLE'],
    [599, 'PROVIDER_UNAVAILABLE'],
  ])(
    'sanitizes Resend %s responses as %s without provider body details',
    async (statusCode, expectedCode) => {
      const client = clientWithStatus(statusCode);
      const sender = new ResendEmailSenderAdapter(
        {
          apiKey: 're_test-sensitive-api-key',
          from: 'Example App <no-reply@example.com>',
        },
        client,
      );

      let thrown: unknown;
      try {
        await sender.send({
          to: 'person@example.com',
          from: 'Example App <no-reply@example.com>',
          subject: 'Subject',
          text: SENSITIVE_RESPONSE,
        });
      } catch (error: unknown) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        name: 'EmailSenderError',
        code: expectedCode,
        message: `Email sender failed: ${expectedCode}`,
      });
      expect(String(thrown)).not.toContain(SENSITIVE_RESPONSE);
      expect(JSON.stringify(thrown)).not.toContain(SENSITIVE_RESPONSE);
    },
  );
});

describe('AUTH-BE-T17 delivery logger regressions', () => {
  it('logs only allowlisted metadata for provider failure and successful CAS revocation', async () => {
    const repository = new InMemoryAuthenticationRepository();
    await saveIssuedChallenge(repository, CHALLENGE_ID);
    const logger = new RecordingLogger();

    scheduleAuthenticationEmailDelivery(
      repository,
      {
        challengeId: CHALLENGE_ID,
        category: 'MAGIC_LOGIN',
        correlationId:
          'email=person@example.com Authorization=Bearer raw-api-key',
        recordedAt: NOW,
        send: () =>
          Promise.reject(
            new Error(
              'provider body person@example.com token=raw-token must stay private',
            ),
          ),
      },
      logger,
    );

    await flushBackgroundDelivery();

    expect(logger.warnRecords).toHaveLength(1);
    expect(logger.warnRecords[0]).toMatchObject({
      eventType: 'MAGIC_LOGIN',
      correlationId: null,
      outcome: 'EMAIL_DELIVERY_FAILED',
      errorCode: 'PROVIDER_UNAVAILABLE',
    });
    expect(logger.infoRecords).toHaveLength(1);
    expect(logger.infoRecords[0]).toMatchObject({
      eventType: 'MAGIC_LOGIN',
      correlationId: null,
      outcome: 'EMAIL_CHALLENGE_REVOKED',
      errorCode: null,
    });
    expect(
      Object.keys(logger.warnRecords[0] ?? {}).sort((left, right) =>
        left.localeCompare(right),
      ),
    ).toEqual(allowlistedLogFields());
    const serializedLogs = JSON.stringify([
      ...logger.infoRecords,
      ...logger.warnRecords,
    ]);
    expect(serializedLogs).not.toContain('person@example.com');
    expect(serializedLogs).not.toContain('raw-token');
    expect(serializedLogs).not.toContain('raw-api-key');
    await expect(
      repository.withTransaction((transaction) =>
        transaction.revokeChallenge(CHALLENGE_ID, 'ISSUED'),
      ),
    ).resolves.toBe(false);
  });
});

describe('AUTH-BE-T17 challenge CAS regressions', () => {
  it('preserves challenge CAS when delivery failure races with prior consumption', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const digest = 'd'.repeat(64);
    await repository.withTransaction((transaction) =>
      transaction.saveChallenge({
        id: CHALLENGE_ID,
        purpose: 'MAGIC_LOGIN',
        digest,
        userId: USER_ID,
        createdAt: NOW,
        expiresAt: new Date(NOW.getTime() + 600_000),
        status: 'ISSUED',
        consumedAt: null,
        stateDigest: null,
        nonceDigest: null,
      }),
    );
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(digest, 'MAGIC_LOGIN', NOW),
      ),
    ).resolves.toMatchObject({ status: 'USED' });
    const logger = new RecordingLogger();

    scheduleAuthenticationEmailDelivery(
      repository,
      {
        challengeId: CHALLENGE_ID,
        category: 'MAGIC_LOGIN',
        correlationId: 'cas-regression',
        recordedAt: NOW,
        send: () => Promise.reject(new EmailSenderError('PROVIDER_REJECTED')),
      },
      logger,
    );

    await flushBackgroundDelivery();

    expect(logger.warnRecords).toHaveLength(1);
    expect(logger.infoRecords).toHaveLength(1);
    expect(logger.infoRecords[0]).toMatchObject({
      outcome: 'EMAIL_CHALLENGE_REVOCATION_SKIPPED',
      errorCode: 'CHALLENGE_STATE_CHANGED',
    });
    await expect(
      repository.withTransaction((transaction) =>
        transaction.consumeChallenge(digest, 'MAGIC_LOGIN', NOW),
      ),
    ).resolves.toBeNull();
  });
});

async function saveIssuedChallenge(
  repository: InMemoryAuthenticationRepository,
  challengeId: string,
): Promise<void> {
  await repository.withTransaction((transaction) =>
    transaction.saveChallenge({
      id: challengeId,
      purpose: 'MAGIC_LOGIN',
      digest: 'c'.repeat(64),
      userId: USER_ID,
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 600_000),
      status: 'ISSUED',
      consumedAt: null,
      stateDigest: null,
      nonceDigest: null,
    }),
  );
}

function allowlistedLogFields(): string[] {
  return [
    'attempt',
    'causationId',
    'consumer',
    'correlationId',
    'durationMs',
    'errorCode',
    'eventId',
    'eventType',
    'eventVersion',
    'exchange',
    'messageId',
    'occurredAt',
    'producer',
    'recordedAt',
    'routingKey',
    'tenantId',
    'outcome',
  ].sort((left, right) => left.localeCompare(right));
}

function clientWithStatus(statusCode: number): ResendEmailHttpClient {
  return { sendEmail: () => Promise.resolve(statusCode) };
}

async function flushBackgroundDelivery(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}
