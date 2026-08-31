import type {
  IntegrationEventEnvelope,
  RabbitConfirmChannelPort,
  RabbitConfirmPublisherPort,
  RabbitTopology,
} from '../../../application/ports/messaging.types';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from './rabbitmq.constants';

export class RabbitConfirmPublisher implements RabbitConfirmPublisherPort {
  public constructor(
    private readonly channel: RabbitConfirmChannelPort,
    private readonly topology: RabbitTopology,
  ) {
    if (topology.exchange !== AUTHENTICATION_RABBIT_TOPOLOGY.exchange) {
      throw new Error('authentication-rabbit-exchange-invalid');
    }
  }

  public async publish(
    envelope: IntegrationEventEnvelope,
    routingKey: string,
  ): Promise<void> {
    await this.channel.assertExchange(this.topology.exchange, 'topic', {
      durable: true,
    });
    await this.channel.publishConfirmed(
      this.topology.exchange,
      routingKey,
      new TextEncoder().encode(JSON.stringify(envelope)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        mandatory: true,
        messageId: envelope.messageId,
        type: envelope.eventType,
        headers: {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          correlationId: envelope.correlationId,
          causationId: envelope.causationId,
          tenantId: envelope.tenantId,
          schemaVersion: envelope.schemaVersion,
        },
      },
    );
  }
}
