---
name: frontend-boundaries
description: Fronteiras de frontend aplicáveis a alterações em frontend.
alwaysApply: false
---

# Frontend

Respeite `schemas/types → services → queries/mutations → forms/orchestration → components/ui`.
`components/client` é somente interatividade local e não substitui orchestration. `*.schema.ts`
fica em `schemas/` e importa Zod; `*.types.ts` fica em `types/` e deriva de `z.infer`;
`*.constants.ts` fica em `constants/`. Zod parseia todo `unknown`; service faz HTTP/mapper/error
sem React/cache/toast; query centraliza keys; mutation invalida/rollback; UI é pura. Server
components são padrão e `use client` fica na menor borda.
Cada feature tem barrel público `src/features/<feature>/index.ts`, barrels nas pastas de código e
alias exato `@<feature>` em `tsconfig.json` e `next.config.ts/turbopack.resolveAlias`; deep import é
proibido.

Toda mutação visível deve expor `pending/syncing` e reconciliação com o backend. Use optimistic update
somente quando a ação for reversível, idempotente, prevista pela spec e tiver rollback definido; não
use essa técnica por obrigação. Não anuncie sucesso antes da confirmação. O primeiro render client
deve ser igual ao HTML do servidor; browser APIs, tempo, random e locale ficam fora do render
inicial.

Reutilize tokens/primitives/estados do Vite sem editar o legado. Fetch em UI, `*.schema.ts` manual,
fallback mock silencioso, cast/any, query inline, regra de domínio no cliente ou hydration quebrada
bloqueiam. Validação no browser é apenas UX; o backend prova autenticação, autorização, tenant,
integridade e regras de negócio.

Use worktree/branch por task, paralelizando apenas owners sem dependência ou
arquivo compartilhado. Constantes semânticas ficam em `*.constants.ts`, UI e
contratos podem ganhar subpastas coesas conforme crescem, e
`eslint-disable`/`eslint-enable` inline é proibido.
