import { AuthenticationError } from '../errors/authentication.error';
import { MAX_EMAIL_LENGTH } from './normalized-email.constants';

export class NormalizedEmail {
  private constructor(public readonly value: string) {}

  public static from(rawEmail: string): NormalizedEmail {
    const value = rawEmail.trim().toLowerCase();
    const atIndex = value.indexOf('@');
    const hasSingleAt =
      atIndex > 0 &&
      atIndex === value.lastIndexOf('@') &&
      atIndex < value.length - 1;
    if (
      value.length === 0 ||
      !hasSingleAt ||
      value.includes(' ') ||
      value.length > MAX_EMAIL_LENGTH
    ) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    return new NormalizedEmail(value);
  }

  public equals(other: NormalizedEmail): boolean {
    return this.value === other.value;
  }
}
