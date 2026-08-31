import type {
  SessionSnapshot,
  SessionStatus,
} from '../types/authentication.types';

export class SessionEntity {
  private constructor(private readonly props: SessionSnapshot) {}

  public static restore(props: SessionSnapshot): SessionEntity {
    return new SessionEntity({ ...props });
  }

  public get snapshot(): SessionSnapshot {
    return { ...this.props };
  }

  public isActive(now: Date): boolean {
    return (
      this.props.status === 'ACTIVE' &&
      this.props.refreshExpiresAt.getTime() > now.getTime()
    );
  }

  public status(): SessionStatus {
    return this.props.status;
  }
}
