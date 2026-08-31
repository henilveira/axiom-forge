---
name: engineering-quality
description: Gates de qualidade, segurança e documentação aplicáveis a toda mudança.
alwaysApply: true
---

# Qualidade

Spec aprovada, AC/BR rastreável, teste no mesmo ciclo, build/lint/typecheck/testes verdes, review e
segurança conforme risco. Não comite segredo, adicione dependência sem aprovação, faça reset/migration
destrutiva, logue Authorization/cookies/tokens/PII ou esconda falha com mock/cast.

Handoff sempre registra status, paths, AC/BR→teste→evidência, comandos/saídas, desvios, riscos,
rollback e próximo owner. STATE e delegation acompanham cada pausa, retorno ou mudança de DAG.

É proibido usar `eslint-disable`, `eslint-enable`, `@ts-ignore` ou cast para
silenciar qualquer regra. Constantes semânticas, políticas, limites, eventos,
rotas e configurações devem estar em `*.constants.ts`; bindings locais
intermediários não são constantes de domínio. Pastas que misturem ownership
devem ser subdivididas por responsabilidade coesa.

Toda implementação precisa de subagente em branch/worktree própria. Tasks
independentes podem ser paralelas apenas sem dependência nem arquivo
compartilhado; migrations, barrels, config, contratos, STATE e integração são
sequenciais. O quality gate bloqueia qualquer violação e registra a lição.
