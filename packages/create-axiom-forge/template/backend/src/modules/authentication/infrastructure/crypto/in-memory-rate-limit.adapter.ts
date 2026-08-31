import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { RateLimitPort } from '../../application/ports/rate-limit.port';

export class InMemoryRateLimitAdapter implements RateLimitPort {
  private readonly attempts = new Map<string, number[]>();

  public constructor(private readonly now: () => Date) {}

  public check(key: string, limit: number, windowMs: number): boolean {
    if (key.length === 0) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    const cutoff = this.now().getTime() - windowMs;
    const active = (this.attempts.get(key) ?? []).filter(
      (value) => value > cutoff,
    );
    this.attempts.set(key, active);
    return active.length < limit;
  }

  public record(key: string, windowMs: number): void {
    const allowed = this.check(key, Number.MAX_SAFE_INTEGER, windowMs);
    if (!allowed) {
      return;
    }
    const values = this.attempts.get(key) ?? [];
    values.push(this.now().getTime());
    this.attempts.set(key, values);
  }
}
