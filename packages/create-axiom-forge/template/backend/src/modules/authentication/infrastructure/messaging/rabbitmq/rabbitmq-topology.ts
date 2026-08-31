import type {
  RabbitConsumerChannelPort,
  RabbitTopology,
} from '../../../application/ports/messaging.types';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from './rabbitmq.constants';
import {
  RABBIT_DEAD_LETTER_EXCHANGE_ARGUMENT,
  RABBIT_MESSAGE_TTL_ARGUMENT,
  RABBIT_QUEUE_TYPE_ARGUMENT,
} from './rabbitmq.constants';

export async function declareAuthenticationTopology(
  channel: RabbitConsumerChannelPort,
  topology: RabbitTopology = AUTHENTICATION_RABBIT_TOPOLOGY,
): Promise<void> {
  await channel.assertExchange(topology.exchange, 'topic', { durable: true });
  await channel.assertExchange(topology.deadLetterExchange, 'topic', {
    durable: true,
  });
  await channel.assertExchange(topology.retryExchange, 'topic', {
    durable: true,
  });
  await channel.assertQueue(topology.deadLetterQueue, {
    durable: true,
    arguments: {},
  });
  await channel.assertQueue(topology.queue, {
    durable: true,
    arguments: {
      [RABBIT_DEAD_LETTER_EXCHANGE_ARGUMENT]: topology.deadLetterExchange,
      [RABBIT_QUEUE_TYPE_ARGUMENT]: 'quorum',
    },
  });
  for (const retryQueue of topology.retryQueues) {
    await channel.assertQueue(retryQueue.queue, {
      durable: true,
      arguments: {
        [RABBIT_MESSAGE_TTL_ARGUMENT]: retryQueue.ttlMs,
        [RABBIT_DEAD_LETTER_EXCHANGE_ARGUMENT]: topology.exchange,
        [RABBIT_QUEUE_TYPE_ARGUMENT]: 'quorum',
      },
    });
    await channel.bindQueue(
      retryQueue.queue,
      topology.retryExchange,
      topology.bindingKey,
    );
  }
  await channel.bindQueue(
    topology.queue,
    topology.exchange,
    topology.bindingKey,
  );
  await channel.bindQueue(
    topology.deadLetterQueue,
    topology.deadLetterExchange,
    topology.bindingKey,
  );
  await channel.prefetch(topology.prefetchCount);
}
