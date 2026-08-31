# CLAUDE.md — Product Workspace

Leia `../AGENTS.md`, `README.md`, `docs/README.md`, o playbook, a knowledge base e o estado do
pacote antes de agir. `/kickoff` é a porta de entrada e não inventa decisão de negócio.

Roteamento:

```text
/kickoff → pesquisa/intake → spec-engineer → aprovação humana
phase-orchestrator → domain-modeler → tech-lead → lanes de engenharia
```

Use a skill `/kickoff` da ferramenta selecionada na raiz do projeto. Os agentes Claude usam
`model: sonnet`; Opus é proibido. Os papéis Backend, Frontend, Test, Quality e Security são
delegados pelo orquestrador e não devem ser duplicados dentro de `product/`.

O projeto derivado precisa explicar problema, persona, valor, evidência, hipótese,
jornada, regras, estados, ACs, métricas, riscos, rollback e fora de escopo antes
de gerar uma spec. `DRAFT`/`IN_REVIEW` não são contrato para engenharia.

O pacote de spec publicado contém `manifest.yaml` e `source_commit`. Uma spec `DRAFT` ou
`IN_REVIEW` nunca é contrato de engenharia; somente `APPROVED` pode seguir para modelagem.
