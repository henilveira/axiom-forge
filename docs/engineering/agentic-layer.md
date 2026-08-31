---
name: agentic-layer
description: Roster mínimo e contrato da camada agêntica projeto derivado para Codex e Claude, com roteamento natural e persistência de delegações.
alwaysApply: false
---

# Camada agêntica do boilerplate

O ecossistema é uma biblioteca versionada + um orquestrador. O usuário fornece intenção; o
`phase-orchestrator` interpreta, consulta artefatos e delega. Skills e agentes não são comandos que
o usuário precisa memorizar.

## Roster canônico (13 papéis)

| Papel | Dono | Saída principal | Não faz |
|---|---|---|---|
| `phase-orchestrator` | fluxo/estado | DAG, delegações, checkpoints | código de produto |
| `spec-engineer` | produto + requisitos | epic, spec, FR/NFR/BR/AC | implementação |
| `domain-modeler` | domínio | domain/design, invariantes | ORM/HTTP |
| `tech-lead` | solução | tasks file-level, contratos, integração | esconder ambiguidade |
| `backend-data-engineer` | dados/infra | schema, Prisma, migration, adapters, decisões | regra de produto |
| `backend-engineer` | backend vertical | domain/application/HTTP, Swagger, testes | migration sem data owner |
| `frontend-engineer` | dados/composição | schemas, services, hooks, forms, páginas | alterar backend |
| `frontend-ui-engineer` | visual | UI pura, tokens, acessibilidade, paridade visual | fetch/cache/domínio |
| `test-engineer` | evidência | unit/integration/contract/E2E | mascarar falhas |
| `quality-engineer` | review | arquitetura, manutenção, gates, veredito | corrigir silenciosamente |
| `security-reviewer` | risco | threat trace, findings, regressões | liberar bypass |
| `release-engineer` | entrega | release, rollback, merge local autorizado | mudar escopo |
| `git-flow-specialist` | GitHub/Git | PR, aprovação, integração e limpeza auditada | implementar produto |

Cada papel possui uma skill Codex em `.agents/skills/` e um agente Claude em `.claude/agents/`, com
o mesmo nome. Claude usa `model: sonnet`; `opus` é proibido. Valide paridade com
`python3 .agents/scripts/validate-agent-parity.py`.

`camada-agentica` é uma skill de manutenção da própria camada, não um agente de execução; por isso
fica fora do roster 1:1 e não recebe um subagente paralelo.

## Roteamento

```text
SPEC       → spec-engineer → domain-modeler → tech-lead
IMPLEMENT  → tech-lead → backend-data-engineer → backend-engineer → integration → frontend → UI
RESUME     → STATE/delegation → primeira pendência desbloqueada
FIX        → reprodução → quality/security → owner da camada → regressão
REVIEW     → quality/security conforme risco → test quando necessário
CLOSE      → test → quality/security → release
```

## Contratos entre papéis

- `spec-engineer → domain-modeler`: spec aprovada, FR/NFR/BR/AC, fontes e perguntas resolvidas.
- `domain-modeler → tech-lead`: bounded contexts, invariantes, ports, alternativas e riscos.
- `tech-lead → backend-data/backend`: tasks com paths, assinatura, dependência, gate e rollback.
- `backend → tech-lead`: código, testes, Swagger e contrato real `integration.md`.
- `tech-lead → frontend`: contrato real ou `PROPOSED`, exemplos, erros e compatibilidade.
- `engenheiros → test/quality/security`: diff, matriz AC/BR, comandos, evidência e riscos.
- `release → usuário`: gates, branch, rollback e decisão pendente.

## Artifacts e ownership

- Produto: `product/docs/` e `product/specs/EPIC-*/`.
- Arquitetura: `docs/architecture/` e ADRs imutáveis.
- Método: `docs/engineering/` e áreas `backend`, `frontend`, `quality-security`, `orchestration`,
  `state`.
- Execução viva: `docs/STATE.md` + `docs/engineering/state/active-delegation.yaml`.
- Código: `backend`, `frontend`; referências de projetos anteriores não fazem parte do template.

Somente o orquestrador altera o DAG/status; cada executor escreve evidência da própria delegação.
Tasks, YAML, STATE, migrations, barrels e contratos compartilhados têm owner único sequencial.

## Retirados do roster ativo

`product-owner` + `requirements-analyst` → `spec-engineer`; quatro `backend-*-engineer` →
`backend-engineer` + `backend-data-engineer`; `frontend-contract` + `frontend-feature` →
`frontend-engineer`; `architecture-reviewer` → `quality-engineer`. Os antigos nomes ficam apenas
como aliases para tarefas históricas. Skills de comando (`kickoff`, `nova-feature`, `clarificar`,
`handoff`, `validar`, `auditar`, `evals`, `diagramar`, `integracoes`, `metricas`, `roadmap`,
`setup-ci`, `revisar-pr`) deixam de ser caminho primário; o orquestrador chama o papel pela intenção.
