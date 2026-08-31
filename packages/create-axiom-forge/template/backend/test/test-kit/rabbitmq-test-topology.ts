import amqplib from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { RabbitTopology } from '../../src/modules/authentication/application/ports/messaging.types';
import { AUTHENTICATION_RABBIT_TOPOLOGY } from '../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbitmq.constants';

export function createIsolatedRabbitTopology(): RabbitTopology {
  const suffix = randomUUID();
  const routingKey = `identity.authentication.test.${suffix}`;

  return {
    ...AUTHENTICATION_RABBIT_TOPOLOGY,
    queue: `${AUTHENTICATION_RABBIT_TOPOLOGY.queue}.${suffix}`,
    retryExchange: `${AUTHENTICATION_RABBIT_TOPOLOGY.retryExchange}.${suffix}`,
    retryQueues: AUTHENTICATION_RABBIT_TOPOLOGY.retryQueues.map(
      (retryQueue) => ({
        ...retryQueue,
        queue: `${retryQueue.queue}.${suffix}`,
      }),
    ),
    deadLetterExchange: `${AUTHENTICATION_RABBIT_TOPOLOGY.deadLetterExchange}.${suffix}`,
    deadLetterQueue: `${AUTHENTICATION_RABBIT_TOPOLOGY.deadLetterQueue}.${suffix}`,
    bindingKey: routingKey,
  };
}

export async function cleanupIsolatedRabbitTopology(
  rabbitUrl: string,
  topology: RabbitTopology,
): Promise<void> {
  const connection = await amqplib.connect(rabbitUrl);
  const channel = await connection.createChannel();
  try {
    for (const queue of [
      topology.queue,
      ...topology.retryQueues.map((retryQueue) => retryQueue.queue),
      topology.deadLetterQueue,
    ]) {
      await channel.deleteQueue(queue);
    }
    await channel.deleteExchange(topology.retryExchange);
    await channel.deleteExchange(topology.deadLetterExchange);
  } finally {
    await channel.close();
    await connection.close();
  }
}
