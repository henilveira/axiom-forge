---
name: backend-library
description: Regras consultáveis para implementação backend projeto derivado em NestJS, Prisma e Postgres.
alwaysApply: false
---

# Biblioteca backend

Leia [contrato operacional](../agent-operating-contract.md) e o [método backend](../backend-engineering-method.md).

## Ordem

`spec aprovada → domain/design → tasks → backend-data-engineer (schema/migration/OCC) → backend-engineer
(domain/application/HTTP) → Swagger/contract → integration.md`.

## Fronteiras

`interfaces → application → domain ← infrastructure`. Aggregate root guarda invariantes; ports
definem substituição; repositories pertencem ao agregado; mappers impedem Prisma no domínio.
Tenant, autorização, transação, idempotência, concorrência, observabilidade e rollback devem estar
explícitos na task e no teste.

## Sinais de alerta

Controller com regra/query, `findFirst` sem ausência, rede em transação, repository genérico,
container paralelo, migration sem backfill/índice/rollback, log sensível e efeito sem port.
