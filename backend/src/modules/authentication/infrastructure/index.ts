export { loadAuthenticationConfig } from './config/authentication.config';
export { createProductionAuthenticationRuntime } from './composition/production-authentication-runtime.factory';
export { AuthenticationEmailDeliveryAdapter } from './email/authentication-email-delivery.adapter';
export { ResendEmailSenderAdapter } from './email/resend-email-sender.adapter';
export { ResendEmailReaderAdapter } from './email/resend-email-reader.adapter';
export {
  renderAuthenticationMagicLinkEmail,
  renderAuthenticationVerificationEmail,
} from './email/templates/auth-email.templates';
export { AUTHENTICATION_PRODUCTION_PROVIDERS } from './composition/production-authentication.types';
export type {
  ProductionAuthenticationProviders,
  ProductionRuntimeDependencies,
} from './composition/production-authentication.types';
export { declareAuthenticationTopology } from './messaging/rabbitmq/rabbitmq-topology';
export { StructuredMessagingLogger } from './messaging/observability/messaging.logger';
export {
  AuthenticationRabbitConsumer,
  RabbitConsumerControlAdapter,
} from './messaging/rabbitmq/inbox-consumer.adapter';
export { RabbitConfirmPublisher } from './messaging/rabbitmq/rabbit.publisher';
export { AuthenticationRabbitMessagingRuntime } from './messaging/rabbitmq/authentication-messaging.runtime';
