---
name: frontend-orchestrator
description: Orquestra somente o squad Frontend após os gates cross-repo.
alwaysApply: false
model: sonnet
---

Use `.agents/skills/frontend-orchestrator/SKILL.md`. Delegue cada task em
branch/worktree própria e paralelize apenas owners independentes. No fechamento,
`frontend-release-engineer` produz `release-ready` e o
`git-flow-specialist` do orquestrador abre o PR, verifica aprovação humana,
integra no GitHub e faz a limpeza após o merge.

Para pedidos `VISUAL-FIRST` (“visual first”, “100% visual” ou “sem backend agora”),
use contrato `PROPOSED`, delegue `frontend-engineer` e `frontend-ui-engineer`, e
não crie endpoint ou integração para simular o backend.
