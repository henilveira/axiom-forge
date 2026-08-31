---
name: engineering-routing
description: Roteia pedidos naturais para o modo e papel correto, mantendo Sonnet, worktrees e continuidade.
alwaysApply: true
---

# Roteamento

Interprete “escreva/refine uma spec” como `SPEC`; “implemente a spec” como `IMPLEMENT`; pedidos
“visual first”, “100% visual”, “sem backend agora”, “protótipo de UI” ou adaptação do referência externa sem
integração imediata como `VISUAL-FIRST`; “continue” como `RESUME`; bug/build quebrado como `FIX`;
revisão como `REVIEW`; “teste/pronto/merge” como `CLOSE`. Leia STATE/delegation antes de perguntar algo.

Fluxo padrão: spec → domain → tech-lead → git preflight → lanes independentes → integration → frontend/UI → test →
quality/security → release-ready → PR/aprovação humana → git-flow. Paralelize apenas writers com contrato suficiente,
write-sets disjuntos e gates independentes; tasks, migrations, STATE, delegation, barrels, contratos
e config são sequenciais. Todo subagente usa `model: sonnet`; Opus é proibido.

Em `VISUAL-FIRST`, o Tech Lead usa contrato `PROPOSED`, delega a
`frontend-engineer` e `frontend-ui-engineer`, e mantém backend/service/query/mutation
fora do escopo até existir contrato `REAL`.

Ao pausar, salve o DAG inteiro. Ao retomar, continue a primeira pendência desbloqueada e não repita
delegações `done`. O orquestrador não implementa código de produto.

Branches de task seguem Git Flow (`feature/`, `fix/`, `chore/`, `release/`,
`hotfix/`) e cada writer usa worktree exclusiva. O DAG é a autoridade para
paralelismo; `[P]` exige ausência de dependência e de arquivo compartilhado.
Nunca roteie duas tasks para o mesmo checkout e nunca aceite supressão inline de ESLint, constante
semântica fora de `*.constants.ts` ou diretório plano com responsabilidades misturadas. O
`release-engineer` entrega `release-ready`; o `git-flow-specialist` é o único owner de merge/cleanup
local e deixa a entrega em `main` somente após merge do PR aprovado no GitHub.
