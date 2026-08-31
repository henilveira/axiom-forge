---
name: delegation-state
description: Contrato do estado durável de delegações projeto derivado para pausar e retomar o plano inteiro.
alwaysApply: false
---

# Estado de delegação

`docs/STATE.md` é o resumo humano; `active-delegation.yaml` é o DAG operacional completo. O chat não
é fonte de verdade.

## Cada delegação registra

`id`, `role`, `status`, `objective`, `spec`, `ac_br`, `depends_on`, `worktree`, `branch`,
`allowed_paths`, `forbidden_paths`, `contract`, `gate`, `rollback`, `evidence`, `handoff` e
`blocked_by`. Status: `pending`, `in_progress`, `blocked`, `done`, `cancelled`.

## Ao pausar

Atualize timestamp, checkpoint, último gate e próximos owners; preserve delegações concluídas e
pendentes. Não compacte o plano em “último agente”. Se houver worktree, registre path/branch e não
reutilize arquivo compartilhado.

## Ao retomar

Confronte YAML com branch, worktrees, diff, testes e arquivos. Reabra apenas com motivo; escolha a
primeira pendência cujas dependências estejam `done`. Um estado inconsistente é `blocked`, não licença
para replanejar silenciosamente.
