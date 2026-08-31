import { AuthenticationError } from '../errors/authentication.error';
import { MIN_HASH_LENGTH } from './session-token-hash.constants';

export class SessionTokenHash {
  private constructor(public readonly value: string) {}

  public static from(value: string): SessionTokenHash {
    if (value.length === 0 || value.length < MIN_HASH_LENGTH) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    return new SessionTokenHash(value);
  }
}
