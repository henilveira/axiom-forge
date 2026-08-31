import {
  RABBITMQ_URLS_ENV,
  RABBITMQ_VHOST_ENV,
} from './authentication.constants';

const ASCII_CONTROL_CHARACTER_MAX = 0x1f;
const DELETE_CHARACTER_CODE_POINT = 0x7f;
const C1_CONTROL_CHARACTER_MIN = 0x80;
const C1_CONTROL_CHARACTER_MAX = 0x9f;

export function parseRabbitMqUrls(
  env: NodeJS.ProcessEnv,
): ReadonlyArray<string> {
  const value = env[RABBITMQ_URLS_ENV];
  if (value === undefined || value.trim().length === 0) {
    return [];
  }
  const vhost = parseRabbitMqVhost(env[RABBITMQ_VHOST_ENV]);
  const urls = value.split(',').map((item) => item.trim());
  if (
    urls.some((item) => {
      try {
        const url = new URL(item);
        return url.protocol !== 'amqp:' && url.protocol !== 'amqps:';
      } catch {
        return true;
      }
    })
  ) {
    throw new Error('RABBITMQ_URLS contains an invalid AMQP URL');
  }
  return urls.map((item) => applyRabbitMqVhost(item, vhost));
}

function parseRabbitMqVhost(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  const vhost = value.trim();
  if (hasControlCharacter(vhost)) {
    throw new Error('RABBITMQ_VHOST contains invalid control characters');
  }
  return vhost;
}

function applyRabbitMqVhost(value: string, vhost: string | undefined): string {
  if (vhost === undefined) {
    return value;
  }

  const url = new URL(value);
  const encodedPath = url.pathname.slice(1);
  if (encodedPath.length > 0) {
    let configuredVhost: string;
    try {
      configuredVhost = decodeURIComponent(encodedPath);
    } catch {
      throw new Error('RABBITMQ_URLS contains an invalid AMQP vhost path');
    }
    if (configuredVhost !== vhost) {
      throw new Error('RABBITMQ_URLS vhost conflicts with RABBITMQ_VHOST');
    }
  }
  url.pathname = `/${encodeURIComponent(vhost)}`;
  return url.toString();
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }
    return (
      codePoint <= ASCII_CONTROL_CHARACTER_MAX ||
      (codePoint >= C1_CONTROL_CHARACTER_MIN &&
        codePoint <= C1_CONTROL_CHARACTER_MAX) ||
      codePoint === DELETE_CHARACTER_CODE_POINT
    );
  });
}
