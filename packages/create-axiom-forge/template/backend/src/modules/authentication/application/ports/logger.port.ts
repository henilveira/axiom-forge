export interface AuthenticationLogMetadata {
  readonly eventId: string | null;
  readonly eventType: string | null;
  readonly eventVersion: number | null;
  readonly messageId: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly producer: string | null;
  readonly consumer: string | null;
  readonly exchange: string | null;
  readonly routingKey: string | null;
  readonly tenantId: string | null;
  readonly attempt: number | null;
  readonly outcome: string | null;
  readonly durationMs: number | null;
  readonly occurredAt: string | null;
  readonly recordedAt: string;
  readonly errorCode: string | null;
}

export interface AuthenticationLoggerPort {
  info(event: string, metadata: AuthenticationLogMetadata): void;
  warn(event: string, metadata: AuthenticationLogMetadata): void;
}
