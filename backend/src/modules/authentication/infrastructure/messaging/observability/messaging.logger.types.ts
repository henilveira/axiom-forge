import type { AuthenticationLogMetadata } from '../../../application/ports/logger.port';

export type MessagingLogValue = string | number | boolean | null;

export type MessagingLogMetadata = AuthenticationLogMetadata;

export interface MessagingTransitionDetails {
  readonly errorCode?: string | null;
  readonly recordedAt?: Date;
  readonly startedAt?: number;
}
