import { NodePasswordHasher } from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';

describe('NodePasswordHasher (Argon2id)', () => {
  const hasher = new NodePasswordHasher();

  it('hashes using the approved Argon2id parameters', async () => {
    const encoded = await hasher.hash('Correct-Horse-Battery-Staple-1');
    expect(encoded.startsWith('$argon2id$')).toBe(true);
    expect(encoded).toContain('m=65536');
    expect(encoded).toContain('t=3');
    expect(encoded).toContain('p=1');
  });

  it('verifies a matching password', async () => {
    const encoded = await hasher.hash('Correct-Horse-Battery-Staple-1');
    await expect(
      hasher.verify('Correct-Horse-Battery-Staple-1', encoded),
    ).resolves.toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const encoded = await hasher.hash('Correct-Horse-Battery-Staple-1');
    await expect(hasher.verify('wrong-password', encoded)).resolves.toBe(false);
  });

  it('rejects malformed or non-Argon2id hashes without throwing', async () => {
    await expect(hasher.verify('anything', 'not-a-hash')).resolves.toBe(false);
    await expect(
      hasher.verify('anything', 'scrypt$1$2$3$salt$hash'),
    ).resolves.toBe(false);
  });

  it('exposes a stable, valid Argon2id dummy hash for timing-safe fallback', async () => {
    expect(hasher.dummyHash.startsWith('$argon2id$')).toBe(true);
    await expect(hasher.verify('anything', hasher.dummyHash)).resolves.toBe(
      false,
    );
  });

  it('produces distinct salts/hashes for the same password across calls', async () => {
    const first = await hasher.hash('same-password-1234');
    const second = await hasher.hash('same-password-1234');
    expect(first).not.toEqual(second);
  });
});
