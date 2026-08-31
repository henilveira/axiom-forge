import { AuthenticationChallenge } from '../entities/authentication-challenge.entity';
import type { AuthenticationChallengeProps } from '../types/challenge.types';

export class AuthenticationChallengeAggregate {
  private constructor(private readonly challenge: AuthenticationChallenge) {}

  public static issue(
    props: AuthenticationChallengeProps,
  ): AuthenticationChallengeAggregate {
    return new AuthenticationChallengeAggregate(
      AuthenticationChallenge.issue(props),
    );
  }

  public static restore(
    props: AuthenticationChallengeProps,
  ): AuthenticationChallengeAggregate {
    return new AuthenticationChallengeAggregate(
      AuthenticationChallenge.restore(props),
    );
  }

  public get snapshot(): AuthenticationChallengeProps {
    return this.challenge.snapshot;
  }

  public consume(now: Date): void {
    this.challenge.consume(now);
  }
}
