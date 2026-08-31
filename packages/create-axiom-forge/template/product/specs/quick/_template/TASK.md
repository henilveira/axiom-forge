---
name: quick-task
description: Trilha leve (tier trivial). Use para tarefa pequena com rastro.
alwaysApply: false
---

# Quick Task — NNN-<slug>

> **Trilha leve** (tier Trivial: ≤3 arquivos, sem decisão). Deixa rastro sem a esteira completa.
> ⚠️ Se ao listar os passos passar de ~5, ou surgir dependência/decisão difícil de reverter,
> **suba de tier**: crie `specs/NNNN-<nome>/` com `spec.md` + `tasks.md`.

- **O quê:** <uma frase>
- **Por quê / origem:** <bug, issue, pedido>
- **Passos:**
  - [ ] <passo atômico>
  - [ ] <passo atômico>
- **Gate:** `<comando de teste que prova que está pronto>` (ver `docs/engineering/TESTING.md`)
