export interface RateLimitPort {
  check(
    key: string,
    limit: number,
    windowMs: number,
  ): boolean | Promise<boolean>;
  record(key: string, windowMs: number): void | Promise<void>;
}
