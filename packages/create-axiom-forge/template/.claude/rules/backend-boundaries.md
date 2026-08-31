---
name: backend-boundaries
description: Fronteiras de backend aplicáveis a alterações em backend.
alwaysApply: false
---

# Backend

Respeite `interfaces → application → domain ← infrastructure`. Domínio é puro e guarda invariantes;
application autoriza/orquestra por ports; infrastructure implementa adapters/repositories; HTTP é
fino. Prisma não atravessa o domínio. Repository é de aggregate root, writes têm tenant/OCC/transação
curta e efeitos externos passam por port após commit.

Assinatura/port antes da implementação; mapper explícito; migration com índice, nullabilidade,
backfill e rollback. Teste unit/integration/contract conforme risco. Controller com regra, `findFirst`
sem ausência, rede em transação, log de segredo ou migration destrutiva bloqueiam.

Organize módulos por responsabilidade coesa, criando subpastas quando um
contexto crescer — por exemplo, `messaging/contracts`, `outbox`, `inbox`,
`rabbitmq`, `retry-dlq` e `observability`. Constantes semânticas ficam em
`*.constants.ts`; supressões inline de ESLint são proibidas.
