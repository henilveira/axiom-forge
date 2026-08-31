import type { RabbitDelivery } from '../../../application/ports/messaging.types';
import type {
  RabbitConsumerChannelPort,
  RabbitTopology,
} from '../../../application/ports/messaging.types';

export interface RabbitConsumerControl {
  retry(delivery: RabbitDelivery, attempt: number): Promise<void>;
  deadLetter(delivery: RabbitDelivery, errorCode: string): Promise<void>;
  replay(delivery: RabbitDelivery): Promise<void>;
}

export interface RabbitControlPublishInput {
  readonly delivery: RabbitDelivery;
  readonly exchange: string;
  readonly routingKey: string;
  readonly attempt: number | null;
  readonly errorCode?: string;
}

export type RabbitControlDependencies = {
  readonly channel: RabbitConsumerChannelPort;
  readonly topology: RabbitTopology;
};
