import type { AuthenticationMethod } from '../types/authentication.types';

export class AuthenticationMethodValue {
  private constructor(public readonly value: AuthenticationMethod) {}

  public static from(value: AuthenticationMethod): AuthenticationMethodValue {
    return new AuthenticationMethodValue(value);
  }
}
