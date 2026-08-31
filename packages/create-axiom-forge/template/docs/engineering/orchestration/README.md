---
name: orchestration-library
description: Método de roteamento natural, delegação, paralelismo e retomada do ecossistema projeto derivado.
alwaysApply: false
---

# Orquestração

O `phase-orchestrator` é manager determinístico: lê pedido e estado, classifica modo, cria DAG,
delega o owner e valida handoff. O usuário não precisa memorizar comandos.

## Regras

- `backend-data-engineer` antes de `backend-engineer`; contrato real antes de frontend;
- writers independentes em worktrees/branches separadas;
- tasks, migrations, barrels, STATE, delegation, README, config e contrato público têm owner único;
- só paralelize tasks sem dependência e sem arquivo compartilhado;
- falha mantém `blocked`; não faça patch no lugar do owner;
- Sonnet para subagentes, nunca Opus.

## Retomada

Leia `docs/STATE.md` + `state/active-delegation.yaml`, confronte com Git/diff e reative a primeira
delegação `pending|in_progress|blocked` desbloqueada. Não repita `done`.
