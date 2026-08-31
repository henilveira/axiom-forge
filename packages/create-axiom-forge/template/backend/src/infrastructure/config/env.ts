/**
 * Carrega o `.env` local antes de qualquer leitura de `process.env`.
 * Em produção o arquivo não existe (a plataforma injeta as variáveis), então
 * ausência do arquivo é estado válido — qualquer outro erro (arquivo ilegível,
 * conteúdo inválido) continua derrubando o boot, porque aí é erro de configuração.
 */
export function loadDotEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Falha rápido e explícito quando o banco não está configurado (spec 0002, caso de borda):
 * subir sem DATABASE_URL é erro de operação, não estado válido da aplicação.
 */
export function requireDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = env['DATABASE_URL']?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL não definida. Copie backend/.env.example para .env e aponte para o Postgres da aplicação.',
    );
  }
  return url;
}
