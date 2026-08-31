---
name: TESTING
description: Comandos de gate e convenções de teste. Puxe ao codar, validar ou montar CI.
alwaysApply: false
---

# TESTING — Como verificar o projeto

> **Fonte única dos comandos de gate** e das convenções de teste. É o que o **DoD**, a **CI** e os
> **subagentes** consomem para provar que uma task/feature está pronta — sem inspeção visual.
> Populado em 2026-08-26, assim que `backend`/`frontend` passaram a existir (Fase 0 #4).
> Não há aplicação legada neste boilerplate; os gates se aplicam aos apps atuais.
> e não ganha mais investimento de teste (congelado, ver ADR-0002).

## Como rodar

### `backend` (NestJS + Prisma + Jest)
| Nível | Comando | Quando |
|---|---|---|
| Unidade + integração | `npm test` (dentro de `backend`) | sempre, rápido |
| Cobertura | `npm run test:cov` | CI — relatório anexado ao PR |
| Aceite (e2e) | `npm run test:e2e` | um teste por `AC-N` que exercita o endpoint real |
| Lint (ciclos, camadas DDD, tipos públicos, nomes e complexidade) | `npm run lint` | pré-commit / CI, bloqueante |
| Código morto/dependências | `npm run quality:dead-code` | CI / antes de fechar fase |
| Build / type-check | `npm run build` | CI, bloqueante |
| Schema do banco | `npx prisma validate` | sempre que `schema.prisma` mudar |

### `frontend` (Next.js + Vitest)
| Nível | Comando | Quando |
|---|---|---|
| Unidade (hooks, lógica, schema Zod) | `npm run test` (dentro de `frontend`) | sempre, rápido |
| Type-check | `npm run typecheck` | pré-commit / CI |
| Lint (ciclos, camadas, tipos públicos, nomes e complexidade) | `npm run lint` | pré-commit / CI, bloqueante |
| Código morto/dependências | `npm run quality:dead-code` | CI / antes de fechar fase |
| Build | `npm run build` | CI, bloqueante — pega erro de TS que o dev/watch não pega |

### CI (`.github/workflows/apps.yml`)
Roda `npm ci && npm run build && npm run lint && npm run test` (+ `npx prisma validate` no
backend) para os dois apps, com path filter (`backend/**` e `frontend/**`) — só dispara quando o app correspondente
muda. `.github/workflows/esteira.yml` continua separado, cobrindo só conformidade de processo SDD
(frontmatter, links, fidelidade da spec), não a aplicação.

## Convenções
- Pirâmide: muitos testes de unidade, menos de integração, poucos de aceite (e2e no backend).
- **Cada `AC-N` da spec tem um teste de aceite que é o seu gate.** Nomeie o teste com o ID
  (`test_AC_1_*` / `AC-1: ...`) para rastreabilidade spec → teste.
- **Backend**: `domain/` não sobe infra — teste unitário puro. `application/` testa caso de uso com
  portas mockadas. `infrastructure/` testa o adapter Prisma de verdade (contra Postgres local/CI).
  `interfaces/` é o teste de aceite (e2e), um por `AC-N`.
- **Frontend**: hook com lógica ganha teste unitário. Componente puro de UI não precisa de teste
  próprio se a lógica que ele exibe já está coberta no hook — mas todo `AC-N` visível na UI vira
  pelo menos um teste (unitário ou de componente).
- **Barrel exports (ADR-0004)**: `import/no-cycle` (eslint-plugin-import) é regra bloqueante nos
  dois apps — barrel concentrado num único `index.ts` raiz cria risco real de ciclo de import;
  isso precisa pegar no lint, não em produção.
- **Análise estática**: type-check (`tsc`/`next build`) é bloqueante nos dois apps. Sem SAST
  configurado ainda — considerar ao rodar `/setup-ci` com escopo maior.

## Gates (Definition of Done executável)
- Uma **task** só vira `done` quando o **Gate (comando)** dela em `tasks.md` passa.
- Uma **feature** só faz merge quando todos os AC estão verdes + lint (incluindo `import/no-cycle`
  e a regra de camadas) + build limpo + cobertura não regride.
- A **CI roda exatamente estes comandos** (`apps.yml`) — falhar bloqueia o merge.

## O que a CI executa
`apps.yml`: por app, em paralelo — `npm ci` → (`npx prisma validate` só no backend) → `npm run
build` → `npm run lint` → `npm run test`. Falha em qualquer passo falha o job. Cobertura ainda não
é publicada como artefato do PR — pendência para quando `/setup-ci` rodar com esse escopo.
