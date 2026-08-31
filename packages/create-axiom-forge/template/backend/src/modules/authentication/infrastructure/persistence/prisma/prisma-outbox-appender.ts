import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type { AuthenticationLoggerPort } from '../../../application/ports/logger.port';
import { outboxPayload } from '../../messaging/outbox/prisma-outbox.store';
import { aggregateIdFor } from './prisma-authentication.mapper';
import {
  AUTHENTICATION_EVENT_PRODUCER,
  AUTHENTICATION_EVENT_TYPE_PREFIX,
} from '../../messaging/contracts/event.constants';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from '../../messaging/rabbitmq/rabbitmq.constants';

export class PrismaOutboxAppender {
  public constructor(
    private readonly client: Prisma.TransactionClient,
    private readonly logger: AuthenticationLoggerPort,
  ) {}

  public async append(
    event: AuthenticationDomainEvent,
    correlationId: string,
  ): Promise<void> {
    const messageId = randomUUID();
    const eventId = randomUUID();
    const eventType = `${AUTHENTICATION_EVENT_TYPE_PREFIX}.${event.type}.v1`;
    const startedAt = Date.now();
    await this.client.outboxMessage.create({
      data: {
        id: randomUUID(),
        messageId,
        eventId,
        aggregateId: aggregateIdFor(event),
        aggregateVersion: 1,
        eventType: event.type,
        eventVersion: 1,
        schemaVersion: 1,
        payload: outboxPayload(event),
        headers: {
          correlationId,
          eventType: event.type,
          schemaVersion: 1,
        },
      },
    });
    const recordedAt = new Date();
    this.logger.info('stored', {
      eventId,
      eventType,
      eventVersion: 1,
      messageId,
      correlationId,
      causationId: null,
      producer: AUTHENTICATION_EVENT_PRODUCER,
      consumer: null,
      exchange: AUTHENTICATION_RABBIT_TOPOLOGY.exchange,
      routingKey: eventType,
      tenantId: null,
      attempt: 0,
      outcome: 'success',
      durationMs: Math.max(0, recordedAt.getTime() - startedAt),
      occurredAt: event.occurredAt.toISOString(),
      recordedAt: recordedAt.toISOString(),
      errorCode: null,
    });
  }
}
