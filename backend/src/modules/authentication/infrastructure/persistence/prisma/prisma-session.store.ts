import type { Prisma } from '../../../../../generated/prisma/client';
import type { SessionSnapshot } from '../../../domain/types/authentication.types';
import { toSession } from './prisma-authentication.mapper';

export class PrismaSessionStore {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async createSession(session: SessionSnapshot): Promise<void> {
    await this.client.sessionFamily.upsert({
      where: { id: session.familyId },
      create: { id: session.familyId, createdAt: session.createdAt },
      update: {},
    });
    await this.client.session.create({
      data: {
        id: session.id,
        familyId: session.familyId,
        userId: session.userId,
        authMethod: session.authMethod,
        accessTokenHash: session.accessTokenHash,
        refreshTokenHash: session.refreshTokenHash,
        status: session.status,
        createdAt: session.createdAt,
        lastRefreshedAt: session.lastRefreshedAt,
        refreshExpiresAt: session.refreshExpiresAt,
        revokedAt: session.revokedAt,
      },
    });
  }

  public async createSessionForActiveUser(
    session: SessionSnapshot,
  ): Promise<boolean> {
    const user = await this.client.user.updateMany({
      where: {
        id: session.userId,
        status: 'ACTIVE',
        emailVerifiedAt: { not: null },
      },
      data: { version: { increment: 1 } },
    });
    if (user.count !== 1) {
      return false;
    }
    await this.createSession(session);
    return true;
  }

  public async findSessionByRefreshHash(
    refreshTokenHash: string,
  ): Promise<SessionSnapshot | null> {
    const session = await this.client.session.findUnique({
      where: { refreshTokenHash },
    });
    return session == null ? null : toSession(session);
  }

  public async findSessionById(
    sessionId: string,
  ): Promise<SessionSnapshot | null> {
    const session = await this.client.session.findUnique({
      where: { id: sessionId },
    });
    return session == null ? null : toSession(session);
  }

  public async rotateSession(
    sessionId: string,
    previousRefreshHash: string,
    nextSession: SessionSnapshot,
    now: Date,
  ): Promise<'ROTATED' | 'REPLAY' | 'INVALID'> {
    const activeUser = await this.client.user.updateMany({
      where: {
        id: nextSession.userId,
        status: 'ACTIVE',
        emailVerifiedAt: { not: null },
      },
      data: { version: { increment: 1 } },
    });
    if (activeUser.count !== 1) {
      return 'INVALID';
    }
    const updated = await this.client.session.updateMany({
      where: {
        id: sessionId,
        refreshTokenHash: previousRefreshHash,
        status: 'ACTIVE',
        refreshExpiresAt: { gt: now },
      },
      data: { status: 'REVOKED', revokedAt: now },
    });
    if (updated.count !== 1) {
      const current = await this.findSessionById(sessionId);
      if (current?.refreshTokenHash === previousRefreshHash) {
        await this.revokeFamily(current.familyId, now);
        return 'REPLAY';
      }
      return 'INVALID';
    }
    await this.createSession(nextSession);
    return 'ROTATED';
  }

  public async revokeSession(sessionId: string, now: Date): Promise<void> {
    await this.client.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: now },
    });
  }

  public async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.client.session.updateMany({
      where: { familyId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: now },
    });
    await this.client.sessionFamily.updateMany({
      where: { id: familyId },
      data: { revokedAt: now },
    });
  }
}
