---
name: CLAUDE
description: Entrada natural da esteira SDD do Axiom Forge.
alwaysApply: true
---

# Operação natural

Leia `AGENTS.md`, `docs/STATE.md` e
`docs/engineering/state/active-delegation.yaml` no início de cada sessão. O
`phase-orchestrator` interpreta intenção natural e escolhe `SPEC`, `IMPLEMENT`,
`RESUME`, `FIX`, `REVIEW` ou `CLOSE`.

## Roteamento

`SPEC → spec-engineer → domain-modeler → tech-lead`.

`IMPLEMENT/RESUME → tech-lead → backend/frontend em lanes disjuntas →
test-engineer → quality-engineer + security-reviewer → release-engineer →
git-flow-specialist`.

Pedidos de discovery e priorização pertencem ao roster local em `product/`;
pedidos de acessibilidade, qualidade visual e testes específicos podem usar o
roster local em `frontend/`.

## Limites

`product/` começa vazio e recebe o contexto e specs do projeto derivado; o
runtime de `backend/` e `frontend/` é escolhido pelo perfil em
`docs/engineering/stack-library/`. A camada que expõe cada contrato é definida
pela stack selecionada; `frontend/` consome contratos aprovados e não inventa
endpoint. A fundação técnica de autenticação é um template opcional, não uma
regra de produto e não deve ser aplicada a perfis incompatíveis.

Use worktrees para writers, preserve alterações do usuário e não faça merge ou
push forçado. Não comite secrets, não logue tokens/cookies/PII, não faça
migration destrutiva e não avance com gate vermelho. O contrato detalhado está
em `docs/engineering/agent-operating-contract.md` e o modo executável em
`docs/engineering/engineering-modus-operandi.md`.
