// Barrel raiz do app (ADR-0004, refinado pelo ADR-0010): superfície pública para quem consome
// este app de FORA da árvore de camadas — `main.ts` (composition root) e testes e2e usam `@`.
// NÃO é canal de import ENTRE as camadas: domain/application/infrastructure/interfaces importam
// umas das outras sempre por caminho relativo direto (`../domain`), nunca via `@` — usar o barrel
// ali fecha ciclo garantido (`@` -> application -> `@` -> domain -> `@`) assim que o primeiro caso
// de uso importar uma entidade, que é a direção normal de dependência do DDD.
// Ordem: de dentro pra fora (domain -> application -> infrastructure -> interfaces),
// pra manter o grafo de import na mesma direção da regra de dependência do CLAUDE.md.
export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './interfaces';

export * from './app.module';
export * from './app.controller';
export * from './app.service';

// main.ts fica fora do barrel de propósito: é o entrypoint (executa bootstrap no import),
// não um módulo consumível.
