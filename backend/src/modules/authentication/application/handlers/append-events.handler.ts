import type { AuthenticationDomainEvent } from '../../domain/events/authentication.event';
import type { TransactionalAuthenticationRepository } from '../ports/authentication-repository.port';

export async function appendAuthenticationEvents(
  repository: TransactionalAuthenticationRepository,
  events: ReadonlyArray<AuthenticationDomainEvent>,
  correlationId: string,
): Promise<void> {
  for (const event of events) {
    await repository.appendOutbox(event, correlationId);
  }
}
