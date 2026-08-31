import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import type { IntegrationEventEnvelope } from '../../../src/modules/authentication/application/ports/messaging.types';
import {
  InMemoryInboxStore,
  InMemoryOutboxStore,
} from '../../../src/modules/authentication/infrastructure/messaging/inbox/in-memory-messaging.store';
import { InboxEventProcessor } from '../../../src/modules/authentication/infrastructure/messaging/inbox/inbox-event.processor';
import { OutboxRelay } from '../../../src/modules/authentication/infrastructure/messaging/outbox/outbox-relay';
import { sanitizeLifecycleRecord } from '../../../src/modules/authentication/infrastructure/messaging/observability/messaging.logger';

class TestLogger implements AuthenticationLoggerPort {
  public readonly events: string[] = [];

  public info(event: string): void {
    this.events.push(event);
  }

  public warn(event: string): void {
    this.events.push(event);
  }
}

describe('authentication messaging reliability', () => {
  it('redacts payload-shaped and malformed error metadata', () => {
    const record = sanitizeLifecycleRecord('processed', {
      eventId: 'event-1',
      messageId: 'message-1',
      correlationId: 'correlation-1',
      tenantId: null,
      attempt: 1,
      outcome: 'success',
      durationMs: 4,
      occurredAt: '2026-08-27T12:00:00.000Z',
      recordedAt: '2026-08-27T12:00:00.004Z',
      errorCode: 'bad error with secret',
      payload: 'password=secret',
      authorization: 'Bearer token',
    });
    expect(record).toMatchObject({
      event: 'processed',
      errorCode: 'UNKNOWN',
    });
    expect(record).not.toHaveProperty('payload');
    expect(record).not.toHaveProperty('authorization');
  });

  it('retries an outbox message and marks it published after publisher confirmation', async () => {
    const store = new InMemoryOutboxStore();
    const logger = new TestLogger();
    let attempts = 0;
    store.add({
      id: 'outbox-1',
      eventId: 'event-1',
      correlationId: 'correlation-1',
      event: {
        type: 'EmailVerified',
        userId: 'user-1',
        occurredAt: new Date('2026-08-27T12:00:00.000Z'),
      },
    });
    const relay = new OutboxRelay(
      store,
      {
        publish(): void {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('broker-unavailable');
          }
        },
      },
      logger,
      { retryBaseMs: 1, retryMaxMs: 10 },
    );
    const now = new Date('2026-08-27T12:00:00.000Z');
    await relay.publishAvailable(now);
    expect(store.get('outbox-1')).toMatchObject({
      status: 'PENDING',
      attempts: 1,
    });
    await relay.publishAvailable(new Date(now.getTime() + 2));
    expect(store.get('outbox-1')).toMatchObject({
      status: 'PUBLISHED',
      attempts: 2,
    });
    expect(logger.events).toEqual(['retry_scheduled', 'published']);
  });

  it('deduplicates inbound events through the inbox before invoking the handler', async () => {
    const store = new InMemoryInboxStore();
    const logger = new TestLogger();
    let handled = 0;
    const processor = new InboxEventProcessor(
      store,
      {
        handle(envelope: IntegrationEventEnvelope): void {
          handled += envelope.eventId.length > 0 ? 1 : 0;
        },
      },
      logger,
      { consumerName: 'identity-consumer' },
    );
    const envelope: IntegrationEventEnvelope = {
      messageId: 'message-1',
      eventId: 'event-1',
      eventType: 'identity.authentication.EmailVerified.v1',
      eventVersion: 1,
      schemaVersion: 1,
      occurredAt: '2026-08-27T12:00:00.000Z',
      producer: 'backend.identity',
      correlationId: 'correlation-1',
      causationId: null,
      tenantId: null,
      data: {
        type: 'EmailVerified',
        userId: 'user-1',
        occurredAt: '2026-08-27T12:00:00.000Z',
      },
    };
    await expect(processor.process(envelope, new Date(), 1)).resolves.toBe(
      'PROCESSED',
    );
    await expect(processor.process(envelope, new Date(), 1)).resolves.toBe(
      'DUPLICATE',
    );
    expect(handled).toBe(1);
    expect(logger.events).toEqual([
      'received',
      'stored',
      'processed',
      'received',
      'duplicate',
    ]);
  });
});
