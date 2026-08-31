import type { DomainClockPort } from '../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../src/modules/authentication/domain/ports/domain-random.port';

export class FixedAuthenticationClock implements DomainClockPort {
  public constructor(
    private readonly current = new Date('2026-08-27T12:00:00.000Z'),
  ) {}

  public now(): Date {
    return new Date(this.current.getTime());
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(this.current.getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return 30 * 24 * 60 * 60 * 1_000;
  }
}

export class FixedAuthenticationRandom implements DomainRandomPort {
  public bytes(size: number): Uint8Array {
    return new Uint8Array(size).fill(1);
  }

  public id(): string {
    return '00000000-0000-4000-8000-000000000001';
  }
}
