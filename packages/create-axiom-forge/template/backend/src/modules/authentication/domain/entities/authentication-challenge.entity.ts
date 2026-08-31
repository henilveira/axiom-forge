import { AuthenticationError } from '../errors/authentication.error';
import type { AuthenticationChallengeProps } from '../types/challenge.types';

export class AuthenticationChallenge {
  private props: AuthenticationChallengeProps;

  private constructor(props: AuthenticationChallengeProps) {
    this.props = props;
  }

  public static issue(
    props: AuthenticationChallengeProps,
  ): AuthenticationChallenge {
    return new AuthenticationChallenge({ ...props, status: 'ISSUED' });
  }

  public static restore(
    props: AuthenticationChallengeProps,
  ): AuthenticationChallenge {
    return new AuthenticationChallenge({ ...props });
  }

  public get snapshot(): AuthenticationChallengeProps {
    return { ...this.props };
  }

  public consume(now: Date): void {
    if (
      this.props.status !== 'ISSUED' ||
      this.props.expiresAt.getTime() <= now.getTime()
    ) {
      throw new AuthenticationError('CHALLENGE_INVALID', 'CHALLENGE_INVALID');
    }
    this.props = { ...this.props, status: 'USED', consumedAt: now };
  }
}
