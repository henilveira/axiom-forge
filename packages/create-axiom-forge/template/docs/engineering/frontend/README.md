---
name: frontend-library
description: Regras consultáveis para implementação frontend projeto derivado em Next.js, React, TypeScript e TanStack Query.
alwaysApply: false
---

# Biblioteca frontend

Leia [contrato operacional](../agent-operating-contract.md) e o [método frontend](../frontend-engineering-method.md).

## Ordem

`integration.md → endpoints → Zod schemas/types/mappers → services → query-options/queries →
mutations → forms → orchestration → UI`. O backend real vem antes; `PROPOSED` é explícito.

## Fronteiras

Service faz HTTP/parse/mapper/error; query controla cache; mutation invalida e faz rollback; form
valida e serializa; orchestration compõe; UI é pura, acessível e visualmente consistente.
RSC é padrão; `use client` só na borda interativa.

## Sinais de alerta

Fetch em UI/render, `unknown` sem Zod, `any`/cast, service com toast/cache, fallback mock silencioso,
query inline, mutation sem invalidação, regra de domínio no cliente e hydration quebrada.
