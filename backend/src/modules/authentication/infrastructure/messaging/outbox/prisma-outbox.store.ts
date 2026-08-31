import type {
  Prisma,
  PrismaClient,
} from '../../../../../generated/prisma/client';
import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type {
  OutboxMessageRecord,
  OutboxClaimInput,
  OutboxDeadLetterInput,
  OutboxLeaseTransitionInput,
  OutboxRetryInput,
  OutboxStorePort,
} from '../../../application/ports/messaging.types';
import { parseStoredAuthenticationEvent } from '../contracts/authentication-event.schema';
import {
  OUTBOX_DEAD_LETTER_STATUS,
  OUTBOX_PENDING_STATUS,
  OUTBOX_PUBLISHED_STATUS,
} from './outbox.constants';
import { PRISMA_OR_FILTER } from '../../persistence/prisma/prisma.constants';

export class PrismaOutboxStore implements OutboxStorePort {
  public constructor(private readonly prisma: PrismaClient) {}

  public async claim({
    owner,
    limit,
    now,
    leaseMs,
  }: OutboxClaimInput): Promise<ReadonlyArray<OutboxMessageRecord>> {
    const candidates = await this.prisma.outboxMessage.findMany({
      where: {
        status: OUTBOX_PENDING_STATUS,
        availableAt: { lte: now },
        [PRISMA_OR_FILTER]: [
          { leaseUntil: null },
          { leaseUntil: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const claimed: OutboxMessageRecord[] = [];
    for (const candidate of candidates) {
      const updated = await this.prisma.outboxMessage.updateMany({
        where: {
          id: candidate.id,
          status: OUTBOX_PENDING_STATUS,
          availableAt: { lte: now },
          [PRISMA_OR_FILTER]: [
            { leaseUntil: null },
            { leaseUntil: { lte: now } },
          ],
        },
        data: {
          attempts: { increment: 1 },
          leaseUntil: new Date(now.getTime() + leaseMs),
          leaseOwner: owner,
          leaseVersion: { increment: 1 },
        },
      });
      if (updated.count === 1) {
        claimed.push(
          toOutboxMessage({
            message: candidate,
            attempts: candidate.attempts + 1,
            leaseOwner: owner,
            leaseVersion: candidate.leaseVersion + 1,
            leaseUntil: new Date(now.getTime() + leaseMs),
          }),
        );
      }
    }
    return claimed;
  }

  public async markPublished(
    input: OutboxLeaseTransitionInput,
  ): Promise<boolean> {
    const updated = await this.prisma.outboxMessage.updateMany({
      where: {
        id: input.messageId,
        status: OUTBOX_PENDING_STATUS,
        leaseOwner: input.owner,
        leaseVersion: input.leaseVersion,
        attempts: input.attempt,
        leaseUntil: { gt: input.now },
      },
      data: {
        status: OUTBOX_PUBLISHED_STATUS,
        publishedAt: input.now,
        leaseUntil: null,
        leaseOwner: null,
      },
    });
    return updated.count === 1;
  }

  public async scheduleRetry(input: OutboxRetryInput): Promise<boolean> {
    const updated = await this.prisma.outboxMessage.updateMany({
      where: {
        id: input.messageId,
        status: OUTBOX_PENDING_STATUS,
        leaseOwner: input.owner,
        leaseVersion: input.leaseVersion,
        attempts: input.attempt,
        leaseUntil: { gt: input.now },
      },
      data: {
        availableAt: input.availableAt,
        leaseUntil: null,
        leaseOwner: null,
        lastErrorCode: input.errorCode,
      },
    });
    return updated.count === 1;
  }

  public async deadLetter(input: OutboxDeadLetterInput): Promise<boolean> {
    const updated = await this.prisma.outboxMessage.updateMany({
      where: {
        id: input.messageId,
        status: OUTBOX_PENDING_STATUS,
        leaseOwner: input.owner,
        leaseVersion: input.leaseVersion,
        attempts: input.attempt,
        leaseUntil: { gt: input.now },
      },
      data: {
        status: OUTBOX_DEAD_LETTER_STATUS,
        leaseUntil: null,
        lastErrorCode: input.errorCode,
        deadLetteredAt: input.now,
        publishedAt: null,
        leaseOwner: null,
      },
    });
    return updated.count === 1;
  }
}

function toOutboxMessage(input: {
  readonly message: {
    readonly id: string;
    readonly messageId: string;
    readonly eventId: string;
    readonly eventType: string;
    readonly eventVersion: number;
    readonly schemaVersion: number;
    readonly payload: unknown;
    readonly headers: unknown;
    readonly attempts: number;
  };
  readonly attempts: number;
  readonly leaseOwner: string;
  readonly leaseVersion: number;
  readonly leaseUntil: Date;
}): OutboxMessageRecord {
  const { message, attempts, leaseOwner, leaseVersion, leaseUntil } = input;
  const event = parseStoredAuthenticationEvent(message.payload);
  const headers = isRecord(message.headers) ? message.headers : null;
  const correlationId = readRequiredString(headers?.['correlationId']);
  if (event == null || correlationId == null) {
    throw new Error('outbox-event-invalid');
  }
  return {
    id: message.id,
    messageId: message.messageId,
    eventId: message.eventId,
    event,
    eventType: message.eventType,
    eventVersion: message.eventVersion,
    schemaVersion: message.schemaVersion,
    correlationId,
    causationId: readOptionalString(headers?.['causationId']),
    tenantId: readOptionalString(headers?.['tenantId']),
    attempts,
    leaseOwner,
    leaseVersion,
    leaseUntil,
  };
}

function serializeEvent(
  event: AuthenticationDomainEvent,
): Prisma.InputJsonObject {
  return {
    type: event.type,
    occurredAt: event.occurredAt.toISOString(),
    ...serializeIdentityFields(event),
    ...serializeSessionFields(event),
  };
}

function serializeIdentityFields(
  event: AuthenticationDomainEvent,
): Prisma.InputJsonObject {
  if (event.type === 'UserRegistrationStarted') {
    return { result: event.result, emailFingerprint: event.emailFingerprint };
  }
  if (event.type === 'UserRegistered') {
    return {
      userId: event.userId,
      authMethod: event.authMethod,
      emailVerified: event.emailVerified,
    };
  }
  if (event.type === 'EmailVerificationIssued') {
    return {
      userId: event.userId,
      challengeId: event.challengeId,
      expiresAt: event.expiresAt.toISOString(),
    };
  }
  if (event.type === 'EmailVerified') {
    return { userId: event.userId };
  }
  if (event.type === 'AuthenticationSucceeded') {
    return { userId: event.userId, authMethod: event.authMethod };
  }
  if (event.type === 'AuthenticationFailed') {
    return {
      authMethod: event.authMethod,
      failureCategory: event.failureCategory,
      ...(event.emailFingerprint === undefined
        ? {}
        : { emailFingerprint: event.emailFingerprint }),
    };
  }
  if (event.type === 'ExternalIdentityLinked') {
    return {
      userId: event.userId,
      provider: event.provider,
      subjectFingerprint: event.subjectFingerprint,
    };
  }
  if (event.type === 'MagicLinkIssued') {
    return {
      challengeId: event.challengeId,
      expiresAt: event.expiresAt.toISOString(),
      emailFingerprint: event.emailFingerprint,
    };
  }
  if (event.type === 'MagicLinkConsumed') {
    return { userId: event.userId, challengeId: event.challengeId };
  }
  return {};
}

function serializeSessionFields(
  event: AuthenticationDomainEvent,
): Prisma.InputJsonObject {
  if (event.type === 'SessionStarted') {
    return {
      sessionId: event.sessionId,
      userId: event.userId,
      authMethod: event.authMethod,
    };
  }
  if (event.type === 'SessionRefreshed') {
    return { sessionId: event.sessionId, familyId: event.familyId };
  }
  if (event.type === 'SessionRevoked') {
    return { sessionId: event.sessionId, reasonCategory: event.reasonCategory };
  }
  if (event.type === 'SessionFamilyReplayDetected') {
    return { familyId: event.familyId, userId: event.userId };
  }
  return {};
}

export function outboxPayload(
  event: AuthenticationDomainEvent,
): Prisma.InputJsonObject {
  return serializeEvent(event);
}

function readRequiredString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readOptionalString(value: unknown): string | null {
  return value === undefined || value == null
    ? null
    : readRequiredString(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
