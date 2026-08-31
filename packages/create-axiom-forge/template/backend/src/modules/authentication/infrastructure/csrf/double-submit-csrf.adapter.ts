import { timingSafeEqual } from 'node:crypto';
import type { CsrfPort } from '../../application/ports/csrf.port';

export class DoubleSubmitCsrfAdapter implements CsrfPort {
  public constructor(private readonly allowedOrigins: ReadonlySet<string>) {}

  public validate(input: {
    readonly origin: string | undefined;
    readonly token: string | undefined;
    readonly cookieToken?: string;
  }): boolean {
    if (
      input.origin === undefined ||
      input.origin.length === 0 ||
      !this.allowedOrigins.has(input.origin) ||
      input.token === undefined ||
      input.token.length === 0 ||
      input.cookieToken === undefined ||
      input.cookieToken.length === 0
    ) {
      return false;
    }
    const received = Buffer.from(input.token);
    const expected = Buffer.from(input.cookieToken);
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }
}
