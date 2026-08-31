import { defineConfig } from 'prisma/config';

// Prisma 7: a URL do datasource mora aqui, não no schema (ver SPEC_DEVIATION em tasks.md).
// .env é opcional — em CI/produção a DATABASE_URL vem do ambiente.
try {
  process.loadEnvFile('.env');
} catch {
  // ponytail: sem dotenv, process.loadEnvFile (stdlib do Node) resolve.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
