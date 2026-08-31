import type { RabbitConsumerChannelPort } from '../../application/ports/messaging.types';
import { AmqplibRabbitChannel } from '../messaging/rabbitmq/amqplib-channel.adapter';
import { RABBITMQ_TOPOLOGY_MODE_ASSERT } from '../messaging/rabbitmq/rabbitmq.constants';

/**
 * Builds a real RabbitMQ channel (amqplib confirm channel) for production.
 * Only `RABBITMQ_TOPOLOGY_MODE=assert` is approved/implemented today: the
 * consumer declares exchange/queues/retry/DLX idempotently on start. Any
 * other value fails closed instead of silently skipping topology setup.
 *
 * This is async by nature (real network connect), so it must be awaited by
 * the process bootstrap before `createProductionAuthenticationRuntime` is
 * called with the resulting channel as `providers.rabbitChannel` — the
 * runtime factory itself stays synchronous.
 */
export async function createProductionRabbitChannel(
  rabbitMqUrls: ReadonlyArray<string>,
  topologyMode: string | undefined,
): Promise<RabbitConsumerChannelPort> {
  const [url] = rabbitMqUrls;
  if (url === undefined) {
    throw new Error(
      'AUTH-001 production RabbitMQ channel is unavailable: missing RABBITMQ_URLS',
    );
  }
  if (topologyMode !== RABBITMQ_TOPOLOGY_MODE_ASSERT) {
    throw new Error(
      'AUTH-001 production RabbitMQ channel is unavailable: RABBITMQ_TOPOLOGY_MODE must be "assert"',
    );
  }
  return await AmqplibRabbitChannel.connect(url);
}
