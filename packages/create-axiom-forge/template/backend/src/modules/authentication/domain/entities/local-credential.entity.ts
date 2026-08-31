import { AuthenticationError } from '../errors/authentication.error';

export class LocalCredential {
  private constructor(public readonly passwordHash: string) {}

  public static create(passwordHash: string): LocalCredential {
    if (passwordHash.length === 0) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    return new LocalCredential(passwordHash);
  }
}
