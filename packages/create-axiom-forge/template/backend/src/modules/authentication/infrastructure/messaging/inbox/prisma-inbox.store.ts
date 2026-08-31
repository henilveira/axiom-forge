import type { PrismaClient } from '../../../../../generated/prisma/client';
import type {
  InboxAcquireInput,
  InboxAcquireResult,
  InboxLease,
  InboxStorePort,
} from '../../../application/ports/messaging.types';
import { PRISMA_OR_FILTER } from '../../persistence/prisma/prisma.constants';
import { PRISMA_INBOX_COMPOSITE_KEY } from '../../persistence/prisma/prisma.constants';
import { INBOX_LEASE_MS } from '../retry-dlq/messaging.constants';

export class PrismaInboxStore implements InboxStorePort {
  public constructor(private readonly prisma: PrismaClient) {}

  public async acquire({
    consumerName,
    eventId,
    messageId,
    receivedAt,
    owner,
  }: InboxAcquireInput): Promise<InboxAcquireResult> {
    const key = { [PRISMA_INBOX_COMPOSITE_KEY]: { consumerName, eventId } };
    const existing = await this.prisma.inboxMessage.findUnique({ where: key });
    if (existing != null) {
      return await this.reclaimOrDuplicate(
        existing,
        messageId,
        receivedAt,
        owner,
      );
    }
    const leaseUntil = new Date(receivedAt.getTime() + INBOX_LEASE_MS);
    try {
      await this.prisma.inboxMessage.create({
        data: {
          consumerName,
          eventId,
          messageId,
          receivedAt,
          leaseUntil,
          leaseOwner: owner,
          leaseVersion: 1,
          attempts: 1,
        },
      });
      return {
        outcome: 'ACQUIRED',
        lease: {
          consumerName,
          eventId,
          messageId,
          leaseOwner: owner,
          leaseUntil,
          leaseVersion: 1,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const raced = await this.prisma.inboxMessage.findUnique({ where: key });
        if (raced == null) {
          throw error;
        }
        return await this.reclaimOrDuplicate(
          raced,
          messageId,
          receivedAt,
          owner,
        );
      }
      throw error;
    }
  }

  private async reclaimOrDuplicate(
    existing: {
      readonly consumerName: string;
      readonly eventId: string;
      readonly processedAt: Date | null;
      readonly leaseUntil: Date | null;
      readonly leaseVersion: number;
      readonly attempts: number;
    },
    messageId: string,
    receivedAt: Date,
    owner: string,
  ): Promise<InboxAcquireResult> {
    if (
      existing.processedAt != null ||
      (existing.leaseUntil != null && existing.leaseUntil > receivedAt)
    ) {
      return { outcome: 'DUPLICATE' };
    }
    const leaseUntil = new Date(receivedAt.getTime() + INBOX_LEASE_MS);
    const leaseVersion = existing.leaseVersion + 1;
    const attempt = existing.attempts + 1;
    const reclaimed = await this.prisma.inboxMessage.updateMany({
      where: {
        consumerName: existing.consumerName,
        eventId: existing.eventId,
        processedAt: null,
        status: { not: 'PROCESSED' },
        leaseVersion: existing.leaseVersion,
        attempts: existing.attempts,
        [PRISMA_OR_FILTER]: [
          { leaseUntil: null },
          { leaseUntil: { lte: receivedAt } },
        ],
      },
      data: {
        messageId,
        receivedAt,
        leaseUntil,
        leaseOwner: owner,
        leaseVersion: { increment: 1 },
        attempts: { increment: 1 },
        status: 'IN_FLIGHT',
      },
    });
    return reclaimed.count === 1
      ? {
          outcome: 'ACQUIRED',
          lease: {
            consumerName: existing.consumerName,
            eventId: existing.eventId,
            messageId,
            leaseOwner: owner,
            leaseUntil,
            leaseVersion,
            attempt,
          },
        }
      : { outcome: 'DUPLICATE' };
  }

  public async complete(
    lease: InboxLease,
    processedAt: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.inboxMessage.updateMany({
      where: inboxLeaseWhere(lease, processedAt),
      data: {
        processedAt,
        leaseUntil: null,
        leaseOwner: null,
        status: 'PROCESSED',
      },
    });
    return updated.count === 1;
  }

  public async recordFailure(
    lease: InboxLease,
    errorCode: string,
    failedAt: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.inboxMessage.updateMany({
      where: inboxLeaseWhere(lease, failedAt),
      data: {
        lastErrorCode: errorCode,
        status: 'FAILED',
        leaseUntil: null,
        leaseOwner: null,
      },
    });
    return updated.count === 1;
  }

  public async renewLease(
    lease: InboxLease,
    leaseUntil: Date,
    now: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.inboxMessage.updateMany({
      where: inboxLeaseWhere(lease, now),
      data: { leaseUntil },
    });
    return updated.count === 1;
  }
}

function inboxLeaseWhere(
  lease: InboxLease,
  now: Date,
): {
  consumerName: string;
  eventId: string;
  messageId: string;
  status: 'IN_FLIGHT';
  leaseOwner: string;
  leaseVersion: number;
  attempts: number;
  leaseUntil: { gt: Date };
} {
  return {
    consumerName: lease.consumerName,
    eventId: lease.eventId,
    messageId: lease.messageId,
    status: 'IN_FLIGHT',
    leaseOwner: lease.leaseOwner,
    leaseVersion: lease.leaseVersion,
    attempts: lease.attempt,
    leaseUntil: { gt: now },
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error != null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
