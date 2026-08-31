import { AuthenticationError } from '../errors/authentication.error';

export class ExternalIdentity {
  private constructor(
    public readonly provider: 'google',
    public readonly subject: string,
    public readonly email: string,
  ) {}

  public static google(subject: string, email: string): ExternalIdentity {
    if (subject.length === 0 || email.length === 0) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    return new ExternalIdentity('google', subject, email);
  }
}
