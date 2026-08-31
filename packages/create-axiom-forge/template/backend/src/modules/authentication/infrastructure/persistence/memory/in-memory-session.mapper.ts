import type { SessionSnapshot } from '../../../domain/types/authentication.types';

export function cloneSession(session: SessionSnapshot): SessionSnapshot {
  return {
    ...session,
    refreshExpiresAt: new Date(session.refreshExpiresAt.getTime()),
    createdAt: new Date(session.createdAt.getTime()),
    lastRefreshedAt:
      session.lastRefreshedAt != null
        ? new Date(session.lastRefreshedAt.getTime())
        : null,
    revokedAt:
      session.revokedAt != null ? new Date(session.revokedAt.getTime()) : null,
  };
}
