import { AuthenticationError } from '../errors/authentication.error';
import type { SessionSnapshot } from '../types/authentication.types';

export class SessionFamilyAggregate {
  private constructor(
    private readonly familyId: string,
    private revokedAt: Date | null,
  ) {}

  public static restore(
    familyId: string,
    revokedAt: Date | null = null,
  ): SessionFamilyAggregate {
    return new SessionFamilyAggregate(familyId, revokedAt);
  }

  public assertBelongs(session: SessionSnapshot): void {
    if (session.familyId !== this.familyId) {
      throw new AuthenticationError('SESSION_INVALID', 'INVALID_CREDENTIAL');
    }
  }

  public assertCanRotate(session: SessionSnapshot, now: Date): void {
    this.assertBelongs(session);
    if (
      this.revokedAt != null ||
      session.status !== 'ACTIVE' ||
      session.refreshExpiresAt.getTime() <= now.getTime()
    ) {
      throw new AuthenticationError('SESSION_INVALID', 'INVALID_CREDENTIAL');
    }
  }

  public revoke(now: Date): void {
    this.revokedAt = now;
  }
}
