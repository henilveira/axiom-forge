import { Prisma } from '../../../../../generated/prisma/client';
import type {
  PendingGoogleLink,
  PendingGoogleLinkCleanupResult,
} from '../../../application/ports/authentication-repository.port';
import { boundedPendingGoogleLinkCleanupLimit } from '../pending-google-link.cleanup';
import { PRISMA_OR_FILTER } from './prisma.constants';
import { toPendingGoogleLink } from './prisma-authentication.mapper';

export class PrismaPendingGoogleLinkStore {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async save(link: PendingGoogleLink, now: Date): Promise<void> {
    // $executeRaw (not $queryRaw): pg_advisory_xact_lock returns void, which
    // the Prisma 7 query compiler cannot deserialize as a result column.
    await this.client.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${link.userId}, 0))`,
    );
    await this.client.pendingGoogleLink.updateMany({
      where: { userId: link.userId, status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        revokedAt: now,
        version: { increment: 1 },
      },
    });
    await this.client.pendingGoogleLink.create({
      data: {
        id: link.id,
        version: link.version,
        userId: link.userId,
        subject: link.subject,
        email: link.email,
        expiresAt: link.expiresAt,
        status: link.status,
        consumedAt: link.consumedAt,
        revokedAt: link.revokedAt,
      },
    });
  }

  public async find(id: string): Promise<PendingGoogleLink | null> {
    const link = await this.client.pendingGoogleLink.findUnique({
      where: { id },
    });
    return link == null ? null : toPendingGoogleLink(link);
  }

  public async consume(
    id: string,
    now: Date,
  ): Promise<PendingGoogleLink | null> {
    const updated = await this.client.pendingGoogleLink.updateMany({
      where: { id, status: 'ACTIVE', consumedAt: null, expiresAt: { gt: now } },
      data: {
        status: 'CONSUMED',
        consumedAt: now,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      return null;
    }
    return await this.find(id);
  }

  public async revoke(id: string, now: Date): Promise<boolean> {
    const updated = await this.client.pendingGoogleLink.updateMany({
      where: { id, status: 'ACTIVE', consumedAt: null },
      data: {
        status: 'REVOKED',
        revokedAt: now,
        version: { increment: 1 },
      },
    });
    return updated.count === 1;
  }

  public async expire(now: Date, limit: number): Promise<number> {
    const boundedLimit = boundedPendingGoogleLinkCleanupLimit(limit);
    if (boundedLimit === 0) {
      return 0;
    }
    const candidates = await this.client.pendingGoogleLink.findMany({
      where: { status: 'ACTIVE', consumedAt: null, expiresAt: { lte: now } },
      select: { id: true, version: true },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: boundedLimit,
    });
    let expired = 0;
    for (const candidate of candidates) {
      const updated = await this.client.pendingGoogleLink.updateMany({
        where: {
          id: candidate.id,
          version: candidate.version,
          status: 'ACTIVE',
          consumedAt: null,
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED', version: { increment: 1 } },
      });
      expired += updated.count;
    }
    return expired;
  }

  public async cleanup(
    now: Date,
    retentionMs: number,
    limit: number,
  ): Promise<PendingGoogleLinkCleanupResult> {
    const boundedLimit = boundedPendingGoogleLinkCleanupLimit(limit);
    const expired = await this.expire(now, boundedLimit);
    if (boundedLimit === 0 || retentionMs < 0) {
      return { expired, deleted: 0 };
    }
    const cutoff = new Date(now.getTime() - retentionMs);
    const candidates = await this.client.pendingGoogleLink.findMany({
      where: {
        [PRISMA_OR_FILTER]: [
          { status: 'CONSUMED', consumedAt: { lte: cutoff } },
          { status: 'REVOKED', revokedAt: { lte: cutoff } },
          { status: 'EXPIRED', expiresAt: { lte: cutoff } },
        ],
      },
      select: { id: true },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: boundedLimit,
    });
    if (candidates.length === 0) {
      return { expired, deleted: 0 };
    }
    const deleted = await this.client.pendingGoogleLink.deleteMany({
      where: {
        id: { in: candidates.map((candidate) => candidate.id) },
        [PRISMA_OR_FILTER]: [
          { status: 'CONSUMED', consumedAt: { lte: cutoff } },
          { status: 'REVOKED', revokedAt: { lte: cutoff } },
          { status: 'EXPIRED', expiresAt: { lte: cutoff } },
        ],
      },
    });
    return { expired, deleted: deleted.count };
  }
}
