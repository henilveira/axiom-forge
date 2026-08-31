import { AUTHENTICATION_RABBIT_TOPOLOGY } from '../../../src/modules/authentication/infrastructure/messaging/rabbitmq/rabbitmq.constants';
import { createIsolatedRabbitTopology } from '../../test-kit/rabbitmq-test-topology';

describe('RabbitMQ integration test topology', () => {
  it('isolates source routing and durable resources per scenario', () => {
    const first = createIsolatedRabbitTopology();
    const second = createIsolatedRabbitTopology();

    expect(first.exchange).toBe(AUTHENTICATION_RABBIT_TOPOLOGY.exchange);
    expect(first.bindingKey).not.toBe(
      AUTHENTICATION_RABBIT_TOPOLOGY.bindingKey,
    );
    expect(first.bindingKey).not.toBe(second.bindingKey);
    expect(first.queue).not.toBe(second.queue);
    expect(first.retryExchange).not.toBe(second.retryExchange);
    expect(first.retryQueues[0]?.queue).not.toBe(second.retryQueues[0]?.queue);
    expect(first.deadLetterExchange).not.toBe(second.deadLetterExchange);
    expect(first.deadLetterQueue).not.toBe(second.deadLetterQueue);
  });
});
