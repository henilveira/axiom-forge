---
name: camada-agentica
description: Mantém a biblioteca e o roster do ecossistema projeto derivado; proponha mudanças e gere somente o que for aprovado.
---

# Camada agêntica — manutenção governada

Você mantém o sistema operacional dos agentes, não implementa produto. A fonte é
`docs/engineering/agentic-layer.md`; o contrato é `docs/engineering/agent-operating-contract.md`.

## Diagnóstico

1. Leia `AGENTS.md`, `CLAUDE.md`, `docs/STATE.md`, índice de engenharia, ADRs e a integração que motivou a mudança.
2. Liste dor observável, insumo, papel afetado, risco e gate; não crie agente quando uma regra ou página resolve.
3. Preserve 1:1: cada papel ativo tem `.agents/skills/<nome>/SKILL.md` e `.claude/agents/<nome>.md`.

## Proposta antes de escrita

Apresente `artefato`, `insumo`, `benefício`, `risco`, `owner`, alternativa rejeitada e gate. Mudanças
em permissões, hooks, roster, integrações, persistência ou convenções exigem aprovação. O que não foi
aprovado vira backlog documentado, não arquivo morto.

## Roster ativo

`phase-orchestrator`, `spec-engineer`, `domain-modeler`, `tech-lead`, `backend-data-engineer`,
`backend-engineer`, `frontend-engineer`, `frontend-ui-engineer`, `test-engineer`, `quality-engineer`,
`security-reviewer` e `release-engineer`.

## Regras de alteração

- Processo em `docs/engineering/`; produto em `product/docs/`; specs em `product/specs/`; estado em
  `docs/STATE.md` e `docs/engineering/state/active-delegation.yaml`.
- Cada skill descreve entrada, pré-voo, sequência, proibições, evidência e handoff. Claude declara
  `model: sonnet`; Opus é proibido.
- Papel absorvido recebe alias em `agentic-layer.md`; não deixe ownership concorrente.
- Não altere `backend`, `frontend` ou código de runtime nesta manutenção. Permissões, hooks, Jira e
  CI exigem justificativa.
- Instruções têm no máximo 200 linhas; detalhe maior vira página linkada.

## Verificação

Rode `python3 .agents/scripts/validate-agent-parity.py`, confira frontmatter, links, limites e
`git diff --check`, e inspecione o diff manualmente. Registre o que mudou, retirou, mapeou e qual é
o próximo passo; não marque a camada pronta com gate vermelho.
