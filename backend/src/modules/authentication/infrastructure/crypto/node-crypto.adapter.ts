import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { argon2id, hash as argon2Hash, verify as argon2Verify } from 'argon2';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port';
import type { PasswordBlocklistPort } from '../../application/ports/password-blocklist.port';
import type { FingerprintPort } from '../../application/ports/fingerprint.port';
import type {
  SessionTokenPair,
  SessionTokenPort,
} from '../../application/ports/session-token.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import {
  ACCESS_TOKEN_BYTES,
  ARGON2ID_DUMMY_HASH,
  ARGON2ID_HASH_PREFIX,
  ARGON2ID_PARAMETERS,
  FINGERPRINT_LENGTH,
  REFRESH_TOKEN_BYTES,
  SESSION_REFRESH_TTL_MS,
} from './crypto.constants';
import type { Argon2idParameters } from './crypto.types';
import { COMPROMISED_PASSWORDS } from '../../application/policies/password.constants';

export class SystemRandom implements DomainRandomPort {
  public bytes(size: number): Uint8Array {
    return randomBytes(size);
  }

  public id(): string {
    return randomUUID();
  }
}

export class SystemClock {
  public now(): Date {
    return new Date();
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(this.now().getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return SESSION_REFRESH_TTL_MS;
  }
}

export class NodePasswordHasher implements PasswordHasherPort {
  public readonly dummyHash = ARGON2ID_DUMMY_HASH;

  public constructor(
    private readonly parameters: Argon2idParameters = ARGON2ID_PARAMETERS,
  ) {}

  public async hash(password: string): Promise<string> {
    return await argon2Hash(password, {
      type: argon2id,
      memoryCost: this.parameters.memoryCost,
      timeCost: this.parameters.timeCost,
      parallelism: this.parameters.parallelism,
      salt: randomBytes(this.parameters.saltLength),
      hashLength: this.parameters.hashLength,
    });
  }

  public async verify(password: string, encodedHash: string): Promise<boolean> {
    if (!encodedHash.startsWith(ARGON2ID_HASH_PREFIX)) {
      return false;
    }
    try {
      return await argon2Verify(encodedHash, password);
    } catch {
      return false;
    }
  }
}

export class NodeSessionTokenAdapter implements SessionTokenPort {
  public issue(): SessionTokenPair {
    const accessToken = randomBytes(ACCESS_TOKEN_BYTES).toString('base64url');
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    return {
      accessToken,
      refreshToken,
      accessTokenHash: this.hash(accessToken),
      refreshTokenHash: this.hash(refreshToken),
    };
  }

  public hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}

export class HmacFingerprintAdapter implements FingerprintPort {
  public constructor(private readonly secret: string) {}

  public email(email: string): string {
    return this.digest(`email:${email}`);
  }

  public subject(subject: string): string {
    return this.digest(`subject:${subject}`);
  }

  public request(value: string): string {
    return this.digest(`request:${value}`);
  }

  private digest(value: string): string {
    return createHmac('sha256', this.secret)
      .update(value, 'utf8')
      .digest('hex')
      .slice(0, FINGERPRINT_LENGTH);
  }
}

export class InMemoryPasswordBlocklist implements PasswordBlocklistPort {
  private readonly values: ReadonlySet<string>;

  public constructor(values: Iterable<string> = COMPROMISED_PASSWORDS) {
    this.values = new Set(values);
  }

  public contains(password: string): boolean {
    return this.values.has(password.toLowerCase());
  }
}
