---
name: tasks
description: Decomposição e gates da feature. Puxe ao implementar.
alwaysApply: false
---

# Tasks — <nome da feature>

> Decomposição da implementação. Cada task **mapeia para um ou mais `AC-N`** (rastreabilidade
> spec → task → commit) e tem um **gate executável**: o comando que prova que ela está pronta.
> Marque `[P]` nas tasks que podem rodar em paralelo (sem dependência entre si).

## Plano
| #  | Task                                  | Cobre AC | Depende de | Gate (comando)        | Status |
|----|---------------------------------------|----------|------------|-----------------------|--------|
| 1  | <ex.: modelar agregado no domínio>    | AC-1     | —          | `<test do domínio>`   | todo   |
| 2  | <ex.: caso de uso na application>     | AC-1,2   | 1          | `<test do caso de uso>`| todo  |
| 3  | <ex.: adapter/repo na infrastructure> | AC-2     | 1          | `<test de integração>`| todo   |
| 4  | <ex.: endpoint na interface> `[P]`    | AC-1,2   | 2,3        | `<test de aceite>`    | todo   |

> Uma task só vira `done` quando o **gate passa** (comandos em `docs/engineering/TESTING.md`) — não por
> inspeção visual. Um commit por task.

## Plano de teste
- Unidade: <invariantes do domínio, value objects>
- Integração: <adapters, repos, contratos>
- Aceite: <um teste por AC da spec.md — é o gate de aceite>

## Divergências (SPEC_DEVIATION)
> Se a implementação precisar fugir da spec, registre aqui antes de seguir (ver `CLAUDE.md`).
- [ ] <task # · motivo · resolução: corrigir código OU atualizar spec/ADR>

## Checklist de Definition of Done
- [ ] Todos os AC verdes **pelo gate executável** (não por inspeção)
- [ ] Nenhum `SPEC_DEVIATION` pendente
- [ ] ADRs de decisões difíceis de reverter registrados
- [ ] Glossário / context-map atualizados se mudaram
- [ ] Spec reflete o que foi construído
- [ ] `docs/STATE.md` atualizado (próximo passo / decisões)
