# CLAUDE.md — Product Workspace

Leia `AGENTS.md`, `docs/README.md`, o playbook, a knowledge base e o estado do pacote antes de agir.
O `product-orchestrator` é a porta de entrada e não inventa decisão de negócio.

Roteamento:

```text
product-orchestrator → product-manager/product-owner
  → ux-researcher + product-designer + business-analyst
  → spec-engineer → jira-planner → aprovação humana
```

Use as skills correspondentes em `.agents/skills/`. Agentes Claude usam `model: sonnet`; Opus é
proibido. Não há agentes Backend ou Frontend neste repo.

O projeto derivado precisa explicar problema, persona, valor, evidência, hipótese,
jornada, regras, estados, ACs, métricas, riscos, rollback e fora de escopo antes
de gerar uma spec. `DRAFT`/`IN_REVIEW` não são contrato para engenharia.

O pacote de spec publicado contém `manifest.yaml` e `source_commit`. A skill `spec-reader` publicada
aqui é consumida pelo `tech-lead` do repositório Backend em uma ref pinada; não copie a skill.
