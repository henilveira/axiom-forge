import type { AuthenticationLoggerPort } from '../../../application/ports/logger.port';
import type {
  InboxStorePort,
  IntegrationEventHandlerPort,
  OutboxStorePort,
  RabbitConsumerChannelPort,
} from '../../../application/ports/messaging.types';

export interface AuthenticationRabbitMessagingRuntimeDependencies {
  readonly rabbitChannel: RabbitConsumerChannelPort;
  readonly inboxStore: InboxStorePort;
  readonly outboxStore: OutboxStorePort;
  readonly eventHandler: IntegrationEventHandlerPort;
  readonly logger: AuthenticationLoggerPort;
}
