export interface DomainClockPort {
  now(): Date;
  at(millisecondsFromNow: number): Date;
  refreshTtlMs(): number;
}
