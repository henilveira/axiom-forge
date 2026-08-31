import { AuthenticationError } from '../../domain/errors/authentication.error';

import {
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
} from './password.constants';

export class PasswordPolicy {
  public constructor(
    private readonly minimumLength = PASSWORD_MINIMUM_LENGTH,
    private readonly maximumLength = PASSWORD_MAXIMUM_LENGTH,
  ) {}

  public validate(password: string): void {
    if (
      password.length < this.minimumLength ||
      password.length > this.maximumLength
    ) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
  }
}
