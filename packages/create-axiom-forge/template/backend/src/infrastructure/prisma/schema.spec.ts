import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('AC-2 — Prisma configurado, sem Supabase', () => {
  const schema = read('prisma/schema.prisma');
  const config = read('prisma.config.ts');

  it('usa Postgres', () => {
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('pega a connection string da variável de ambiente DATABASE_URL', () => {
    expect(config).toContain('process.env.DATABASE_URL');
  });

  it('não referencia Supabase', () => {
    expect(schema.toLowerCase()).not.toContain('supabase');
    expect(config.toLowerCase()).not.toContain('supabase');
  });
});
