import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadDotEnvFile, requireDatabaseUrl } from './env';

describe('carregamento do .env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'application-env-'));

  // ponytail: popular process.env é trabalho do process.loadEnvFile (stdlib);
  // o que testamos aqui é só o tratamento de erro que este wrapper adiciona.
  // Jest isola process.env por suíte, então o efeito do load não é observável daqui.
  it('lê um arquivo existente sem erro', () => {
    const file = join(dir, 'ok.env');
    writeFileSync(file, 'APPLICATION_ENV_SPEC_VALUE="carregado"\n');
    expect(() => loadDotEnvFile(file)).not.toThrow();
  });

  it('não derruba o boot quando o arquivo não existe (produção injeta as variáveis)', () => {
    expect(() => loadDotEnvFile(join(dir, 'ausente.env'))).not.toThrow();
  });

  it('propaga erro que não seja arquivo ausente', () => {
    expect(() => loadDotEnvFile(dir)).toThrow();
  });
});

describe('AC-2 (borda) — configuração de banco', () => {
  it('devolve a DATABASE_URL quando definida', () => {
    expect(requireDatabaseUrl({ DATABASE_URL: 'postgresql://x' })).toBe(
      'postgresql://x',
    );
  });

  it.each([{}, { DATABASE_URL: '' }, { DATABASE_URL: '   ' }])(
    'falha com erro claro quando DATABASE_URL está ausente ou vazia (%p)',
    (env) => {
      expect(() => requireDatabaseUrl(env)).toThrow(
        /DATABASE_URL não definida/,
      );
    },
  );
});
