const AUTHENTICATION_EXCHANGE = 'identity.authentication';
const AUTHENTICATION_QUEUE = 'identity.authentication.events';
const AUTHENTICATION_RETRY_EXCHANGE = 'identity.authentication.retry';
const RABBIT_RETRY_DELAY_MS = 1_000;
const AUTHENTICATION_RETRY_QUEUES = [
  {
    queue: 'identity.authentication.retry',
    ttlMs: RABBIT_RETRY_DELAY_MS,
  },
] as const;
const AUTHENTICATION_DEAD_LETTER_EXCHANGE = 'identity.authentication.dlx';
const AUTHENTICATION_DEAD_LETTER_QUEUE = 'identity.authentication.events.dlq';
const RABBIT_PREFETCH_COUNT = 10;
export const RABBIT_RELAY_INTERVAL_MS = 1_000;
export const RABBIT_CONNECTION_TIMEOUT_MS = 10_000;
export const RABBITMQ_TOPOLOGY_MODE_ASSERT = 'assert';
export const RABBIT_DEAD_LETTER_EXCHANGE_ARGUMENT = 'x-dead-letter-exchange';
export const RABBIT_MESSAGE_TTL_ARGUMENT = 'x-message-ttl';
export const RABBIT_QUEUE_TYPE_ARGUMENT = 'x-queue-type';
export const RABBIT_ATTEMPT_HEADER = 'x-attempt';
export const AUTHENTICATION_RABBIT_TOPOLOGY = {
  exchange: AUTHENTICATION_EXCHANGE,
  queue: AUTHENTICATION_QUEUE,
  retryExchange: AUTHENTICATION_RETRY_EXCHANGE,
  retryQueues: AUTHENTICATION_RETRY_QUEUES,
  deadLetterExchange: AUTHENTICATION_DEAD_LETTER_EXCHANGE,
  deadLetterQueue: AUTHENTICATION_DEAD_LETTER_QUEUE,
  bindingKey: 'identity.authentication.#',
  prefetchCount: RABBIT_PREFETCH_COUNT,
} as const;
