import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

describe('Google OAuth sealed storage migration contract', () => {
  const migration = read(
    'prisma/migrations/20260828000000_auth_001_seal_google_oauth_transactions/migration.sql',
  );
  const schema = read('prisma/schema.prisma');
  const store = read(
    'src/modules/authentication/infrastructure/external/google/prisma-google-transaction.store.ts',
  );

  it('quarantines the old table and preserves it without destructive SQL', () => {
    const executableSql = migration
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');

    expect(migration).toContain(
      'RENAME TO "auth_google_oauth_transactions_legacy"',
    );
    expect(migration).toContain(
      'CREATE TABLE "auth_google_oauth_transactions"',
    );
    expect(executableSql.toUpperCase()).not.toContain('DELETE FROM');
    expect(executableSql.toUpperCase()).not.toContain('DROP COLUMN');
    expect(executableSql.toUpperCase()).not.toContain('DROP TABLE');
  });

  it('maps Prisma only to sealed columns on the replacement table', () => {
    const modelStart = schema.indexOf('model GoogleOAuthTransaction {');
    const modelEnd = schema.indexOf('\n}', modelStart);
    const model =
      modelStart >= 0 && modelEnd >= 0
        ? schema.slice(modelStart, modelEnd)
        : undefined;

    expect(model).toBeDefined();
    expect(model).toContain('stateHash');
    expect(model).toContain('sealedPayload');
    const modelFields = model?.split('\n').map((line) => line.trim()) ?? [];
    expect(modelFields.some((line) => line.startsWith('state '))).toBe(false);
    expect(modelFields.some((line) => line.startsWith('nonce '))).toBe(false);
    expect(modelFields.some((line) => line.startsWith('codeVerifier '))).toBe(
      false,
    );
    expect(
      modelFields.some((line) => line.startsWith('authorizationUrl ')),
    ).toBe(false);
    expect(model).toContain('@@map("auth_google_oauth_transactions")');
  });

  it('proves the runtime store has no read path to the quarantined table', () => {
    expect(store).toContain('auth_google_oauth_transactions');
    expect(store).not.toContain('auth_google_oauth_transactions_legacy');
    expect(store.toLowerCase()).not.toContain('legacy');
  });
});
