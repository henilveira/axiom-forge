import type { AuthenticationRepositoryPort } from '../ports/authentication-repository.port';
import type { AuthenticationLoggerPort } from '../ports/logger.port';
import { EmailSenderError } from '../ports/email-sender.port';
import type {
  AuthenticationEmailDeliveryObservation,
  AuthenticationEmailDeliveryTask,
} from './email-delivery.types';
import {
  EMAIL_CHALLENGE_REVOKED,
  EMAIL_CHALLENGE_REVOCATION_FAILED,
  EMAIL_CHALLENGE_REVOCATION_SKIPPED,
  EMAIL_CHALLENGE_STATE_CHANGED,
  EMAIL_DELIVERY_FAILED,
  EMAIL_DELIVERY_SUCCEEDED,
  EMAIL_REVOCATION_FAILED,
  EMAIL_UNKNOWN_PROVIDER_FAILURE,
} from './email-delivery.constants';

/**
 * Starts delivery only after the public use case has returned its uniform
 * response. A failed delivery revokes the still-issued challenge without
 * exposing provider details or retaining a raw token in persistence.
 */
export function scheduleAuthenticationEmailDelivery(
  repository: AuthenticationRepositoryPort,
  task: AuthenticationEmailDeliveryTask,
  logger?: AuthenticationLoggerPort,
): void {
  queueMicrotask(() => {
    void deliverAndRevokeOnFailure(repository, task, logger);
  });
}

async function deliverAndRevokeOnFailure(
  repository: AuthenticationRepositoryPort,
  task: AuthenticationEmailDeliveryTask,
  logger?: AuthenticationLoggerPort,
): Promise<void> {
  try {
    await task.send();
    writeInfo(logger, 'processed', task, {
      outcome: EMAIL_DELIVERY_SUCCEEDED,
      errorCode: null,
    });
    return;
  } catch (error: unknown) {
    writeWarn(logger, 'rejected', task, {
      outcome: EMAIL_DELIVERY_FAILED,
      errorCode: providerErrorCode(error),
    });
    try {
      const revoked = await repository.withTransaction((transaction) =>
        transaction.revokeChallenge(task.challengeId, 'ISSUED'),
      );
      writeInfo(logger, revoked ? 'processed' : 'rejected', task, {
        outcome: revoked
          ? EMAIL_CHALLENGE_REVOKED
          : EMAIL_CHALLENGE_REVOCATION_SKIPPED,
        errorCode: revoked ? null : EMAIL_CHALLENGE_STATE_CHANGED,
      });
    } catch {
      writeWarn(logger, 'rejected', task, {
        outcome: EMAIL_CHALLENGE_REVOCATION_FAILED,
        errorCode: EMAIL_REVOCATION_FAILED,
      });
    }
  }
}

function providerErrorCode(error: unknown): string {
  return error instanceof EmailSenderError
    ? error.code
    : EMAIL_UNKNOWN_PROVIDER_FAILURE;
}

function writeInfo(
  logger: AuthenticationLoggerPort | undefined,
  event: 'processed' | 'rejected',
  task: AuthenticationEmailDeliveryTask,
  observation: AuthenticationEmailDeliveryObservation,
): void {
  if (logger === undefined) {
    return;
  }
  try {
    logger.info(event, metadata(task, observation));
  } catch {
    // Observability must never change delivery or revocation semantics.
  }
}

function writeWarn(
  logger: AuthenticationLoggerPort | undefined,
  event: 'rejected',
  task: AuthenticationEmailDeliveryTask,
  observation: AuthenticationEmailDeliveryObservation,
): void {
  if (logger === undefined) {
    return;
  }
  try {
    logger.warn(event, metadata(task, observation));
  } catch {
    // Observability must never change delivery or revocation semantics.
  }
}

function metadata(
  task: AuthenticationEmailDeliveryTask,
  observation: AuthenticationEmailDeliveryObservation,
) {
  return {
    eventId: null,
    eventType: task.category,
    eventVersion: null,
    messageId: null,
    correlationId: safeCorrelationId(task.correlationId),
    causationId: null,
    producer: 'authentication-email-delivery',
    consumer: null,
    exchange: null,
    routingKey: null,
    tenantId: null,
    attempt: null,
    outcome: observation.outcome,
    durationMs: null,
    occurredAt: null,
    recordedAt: task.recordedAt.toISOString(),
    errorCode: observation.errorCode,
  };
}

function safeCorrelationId(value: string): string | null {
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
}
