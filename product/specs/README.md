---
name: specifications-library
description: Convenção neutra da biblioteca de especificações do projeto derivado.
alwaysApply: false
---

# Biblioteca de Especificações

Nenhuma spec de produto acompanha o boilerplate. Use este layout quando o
projeto derivado tiver uma decisão aprovada:

```text
specs/EPIC-<id>-<slug>/
  epic.md
  US-<id>-<slug>/
    spec.md requirements.md domain.md design.md tasks.md
    delegation.yaml integration.md decisions.md
```

Status permitido: `DRAFT → IN_REVIEW → APPROVED → IMPLEMENTED → SUPERSEDED`.
Todo pacote publicado para o Backend precisa de `manifest.yaml` com `spec_id`,
`version`, `status`, `owner`, `approved_at` e `source_commit`.

`spec.md` define comportamento; requirements, domain, design e tasks detalham
sem contradizer. Cada AC aparece em requisitos, task, teste e handoff. Um plano
sem teste, arquivo exato, gate e rollback não está pronto.

Use os modelos em `_templates/` e a trilha rápida em `quick/_template/`.
