---
name: engineering-operating-model
description: Modelo operacional do time projeto derivado: modos naturais, ownership, sequência, paralelismo, continuidade e Definition of Done.
alwaysApply: false
---

# Modelo operacional de engenharia

O usuário traz intenção; o `phase-orchestrator` transforma intenção em um plano verificável. Cada
papel possui uma responsabilidade forte, um artefato de saída e um handoff. Nenhum agente decide
sozinho comportamento de produto ou implementa fora da task.

## Time ativo

| Papel | Entrega | Não faz |
|---|---|---|
| `phase-orchestrator` | modo, DAG, delegações, checkpoints | produto/código |
| `spec-engineer` | épico, stories, spec, FR/NFR/BR/AC | solução interna |
| `domain-modeler` | bounded contexts, invariantes, domain/design | ORM/HTTP |
| `tech-lead` | tasks file-level, dependências, contrato real | esconder ambiguidade |
| `backend-data-engineer` | schema, Prisma, migrations, adapters, OCC | regra de produto |
| `backend-engineer` | domínio/application/HTTP/Swagger da fatia | migration sem owner |
| `frontend-engineer` | Zod, services, queries, mutations, forms, composição | alterar backend |
| `frontend-ui-engineer` | UI pura, tokens, acessibilidade, paridade visual | fetch/cache/domínio |
| `test-engineer` | unit/integration/contract/E2E e test-kit | mascarar falhas |
| `quality-engineer` | review arquitetural, regressão, gates, veredito | corrigir silenciosamente |
| `security-reviewer` | threat trace, ASVS, findings, regressões | liberar bypass |
| `release-engineer` | gates finais, estado, rollback, merge autorizado | mudar escopo |

## Modos e fluxo

```text
SPEC → spec-engineer → domain-modeler → tech-lead
IMPLEMENT → tech-lead → backend-data-engineer → backend-engineer → integration → frontend → UI
  → test → quality + security → release
RESUME → STATE/delegation → primeira pendência desbloqueada
FIX → reprodução → quality/security → owner da camada → regressão
REVIEW → quality/security → test quando necessário
CLOSE → gates → contrato/STATE → release
```

`backend-data-engineer` termina antes de qualquer endpoint dependente; backend publica `integration.md`
real antes de frontend considerar o contrato `REAL`. Paralelismo só ocorre em tasks independentes
sem arquivos compartilhados; migrations, barrels, tasks, STATE, contratos e configuração têm owner
único sequencial. Writers usam worktrees próprias e Claude sempre Sonnet, nunca Opus.

## Definition of Ready

Uma task só entra no DAG quando tem spec aprovada, AC/BR observáveis, bounded context, owner,
arquivos permitidos/proibidos, assinatura/contrato, dependências, gate, teste, rollback e condição
de conclusão. Ambiguidade que muda produto é `OPEN-REQ`, não nota informal.

## Definition of Done

- AC/BR rastreável para task, teste e evidência executada;
- domínio, application, infraestrutura/interfaces e frontend respeitam as fronteiras;
- produção, testes, fixtures, builders e mocks separados;
- build, lint, typecheck e testes aplicáveis verdes;
- review estrutural e segurança feitos quando o risco exige;
- Swagger e `docs/integration/<fase>.md` refletem o código real;
- STATE, delegation, README e ADRs atualizados;
- branch/worktree reproduzível, sem segredo, com rollback claro.

## Handoff mínimo

`status`, `mode`, feature/task, arquivos alterados/não tocados, AC/BR→teste→evidência, comandos e
saídas, desvios/decisões, riscos/rollback e próximo papel. O orquestrador atualiza apenas a
delegação retornada e nunca marca `done` sem gate.

## Continuidade

`docs/STATE.md` explica o contexto humano; `docs/engineering/state/active-delegation.yaml` guarda o
DAG operacional. Ao pausar, preserve status, dependências, worktree/branch, último gate, bloqueio,
próximo passo e contexto entregue. Ao retomar, confronte YAML com Git/diff e continue a primeira
pendência desbloqueada; não repita `done` nem dependa do histórico do chat.

## Referências

O modelo combina sequência por camadas, contract-first e UI pura,
DDD tático da [Microsoft](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice),
persistência de estado/resume dos [Agents Sessions](https://openai.github.io/openai-agents-python/sessions/),
e worktrees do [Git](https://git-scm.com/docs/git-worktree).
