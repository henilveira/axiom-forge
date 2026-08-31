---
name: engineering-modus-operandi
description: Método executável para transformar intenção em spec, delegar implementação, provar qualidade e retomar trabalho projeto derivado.
alwaysApply: false
---

# Modus operandi

Começamos por contexto verificável e contrato mínimo, não pelo arquivo mais fácil. O
`phase-orchestrator` é a porta natural; os artefatos versionados são a memória de longo prazo.

## Modo e primeiro gate

| Pedido natural | Modo | Primeiro owner |
|---|---|---|
| escrever/refinar épico, história ou spec | `SPEC` | `spec-engineer` |
| implementar spec aprovada | `IMPLEMENT` | `tech-lead` |
| continuar/retomar | `RESUME` | primeira delegação desbloqueada |
| bug, erro de build/teste | `FIX` | reprodução → owner |
| revisar arquitetura/código/segurança | `REVIEW` | quality/security |
| testar, validar, pronto, merge | `CLOSE` | test → quality → release |

## Gates A–G

**A — intenção:** `spec-engineer` registra problema, persona, escopo, épico/stories, FR/NFR, BR,
AC, erros, permissões, tenant, limites, métricas e `OPEN-REQ`.

**B — modelo:** após aprovação, `domain-modeler` define bounded context, agregados, estados,
invariantes, eventos, policies, ports, alternativas, riscos e `domain.md`/`design.md`.

**C — plano:** `tech-lead` cria `tasks.md` file-level: ID, owner, paths, assinaturas, AC/BR,
dependências, gate, teste, rollback e critério independente.

**D — dados:** `backend-data-engineer` aprofunda schema, constraints, índices, tenant, Prisma,
mapper, migration/backfill, OCC, adapters e DI. Sem mudança de produto.

**E — backend:** `backend-engineer` implementa assinatura/port → domínio → application → HTTP/
Swagger → testes. Ao terminar, `tech-lead` publica contrato real em `docs/integration/`.

**F — frontend e prova:** `frontend-engineer` faz Zod → service → query/mutation → forms →
orchestration; `frontend-ui-engineer` mantém tokens, acessibilidade e paridade visual; `test-engineer`
completa unit/integration/contract/E2E; quality/security revisam.

**G — release:** `release-engineer` verifica gates, segredo, migration, rollback, docs, estado,
branch e worktrees. Merge local só com autorização explícita.

## Método de uma task

1. Leia task, AC/BR, paths, consumidores e gate.
2. Encontre código equivalente, port/schema/barrel/teste/migration antes de criar arquivo.
3. Desenhe fluxo, estado, erro, concorrência e autorização no handoff.
4. Escreva a assinatura/contrato antes da implementação.
5. Mantenha uma responsabilidade por arquivo e a regra na camada dona.
6. Escreva o teste no mesmo ciclo; cubra erro, limite e permissão aplicáveis.
7. Rode gate curto, depois typecheck/lint/build e testes definidos.
8. Revise diff, consumidores, imports, nomes, tamanho, segurança e docs.
9. Atualize delegation/STATE e entregue o handoff padrão.

## Paralelismo e worktrees

Só paralelize tasks que não compartilham arquivos, estado ou contrato e que têm gates independentes.
Cada writer recebe worktree/branch própria; tasks, migrations, barrels, STATE, delegation, README,
config e contrato público ficam sequenciais. Claude usa `isolation: worktree`; subagentes usam
`sonnet`, nunca `opus`. O orquestrador integra somente diffs verdes e revisados.

## Stop conditions

Pare com spec não aprovada, `OPEN-REQ` comportamental, contrato ausente/contraditório, tenant sem
fonte, segredo, migration destrutiva, dependência nova sem aprovação, teste não determinístico ou
arquivo fora do escopo necessário. `SPEC_DEVIATION` registra divergência consciente; não esconde
bypass, falha ou decisão de produto.

## Handoff padrão

```text
status: ok | bloqueado | precisa de decisão
mode: SPEC | IMPLEMENT | RESUME | FIX | REVIEW | CLOSE
task/feature:
arquivos alterados / não tocados:
AC/BR → teste → evidência:
comandos e resultados:
OPEN-REQ / SPEC_DEVIATION:
riscos / rollback:
próximo papel / contexto:
```

## Continuidade

Ao pausar, atualize `docs/STATE.md` e `docs/engineering/state/active-delegation.yaml` com DAG,
status de cada delegação, dependências, checkpoint, worktree/branch, último gate, bloqueio e próximo
passo. Ao retomar, confronte o registro com Git/diff; continue a primeira pendência desbloqueada e
preserve o plano inteiro, não apenas o último agente.
