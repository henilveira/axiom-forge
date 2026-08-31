---
name: engineering-library
description: Índice da biblioteca de engenharia do boilerplate: arquitetura, backend, frontend, qualidade, segurança, orquestração e estado.
alwaysApply: false
---

# Biblioteca de engenharia

Carregue apenas a área necessária; a regra transversal deve viver aqui ou em ADR, não em um prompt
isolado.

- [Orquestração](orchestration/README.md) — modos, DAG, owners, worktrees e retomada.
- [Backend](backend/README.md) — DDD, application, dados, Prisma, HTTP e integração.
- [Frontend](frontend/README.md) — Next, Zod, queries, mutations e UI.
- [Qualidade e segurança](quality-security/README.md) — testes, review, ASVS e release.
- [Estado](state/delegation-state.md) — persistência do plano e checkpoints.
- [Contrato operacional](agent-operating-contract.md) — nomes, boundaries, mocks e handoff.
- [Modus operandi](engineering-modus-operandi.md) — sequência e stop conditions.
- [Modelo operacional](operating-model.md) — ownership e Definition of Done.
- [Camada agêntica](agentic-layer.md) — roster Codex/Claude e aliases.
