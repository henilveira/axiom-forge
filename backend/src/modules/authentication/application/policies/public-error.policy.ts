import { AuthenticationError } from '../../domain/errors/authentication.error';

export class PublicErrorPolicy {
  public genericFailure(): AuthenticationError {
    return new AuthenticationError('INVALID_CREDENTIAL', 'INVALID_CREDENTIAL');
  }

  public challengeFailure(): AuthenticationError {
    return new AuthenticationError('CHALLENGE_INVALID', 'CHALLENGE_INVALID');
  }
}
