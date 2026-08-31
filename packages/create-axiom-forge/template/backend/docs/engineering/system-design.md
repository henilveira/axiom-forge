# System design do Backend

## Limites

```text
interfaces → application → domain ← infrastructure
```

- `domain`: agregados, value objects, invariantes e eventos de domínio puros.
- `application`: casos de uso, ports, transação, autorização e coordenação.
- `infrastructure`: Prisma/Postgres, RabbitMQ, outbox/inbox, clock, logger e
  adapters externos.
- `interfaces`: controllers, consumers, DTOs, pipes, serialização e composição
  de resposta.

Nenhum módulo cruza o limite por conveniência. O domínio não conhece NestJS,
Prisma, RabbitMQ ou observabilidade.

## EDA operacional

Comandos mudam estado dentro de uma transação local. O evento de domínio é
convertido em mensagem de integração e persistido no outbox na mesma transação
do agregado. Um relay publica no RabbitMQ; consumidores usam inbox/deduplicação,
ack somente após sucesso e retry com backoff. Mensagens que excederem a política
vão para DLQ, com alerta e procedimento de replay seguro.

```text
HTTP/consumer → use case → aggregate + outbox
                              ↓
                       relay → RabbitMQ exchange
                              ↓
                    consumer → inbox → use case
```

Mensagens são at-least-once. Handlers devem ser idempotentes; ordenação só pode
ser assumida quando declarada no contrato por agregado/partition key.

## Observabilidade e dados

Cada evento publicado, recebido, processado, retryado, rejeitado ou enviado à
DLQ gera log estruturado com `eventId`, `eventType`, `eventVersion`,
`messageId`, `correlationId`, `causationId`, `producer`, `consumer`, `exchange`,
`routingKey`, `tenantId` interno, `attempt`, `outcome`, `durationMs` e
`occurredAt`. O log registra metadados para investigação; não registra payload
bruto, Authorization, cookies, tokens, credenciais ou PII.

Outbox e inbox devem permitir auditoria técnica por IDs, estado, timestamps,
erro sanitizado e hash/quantidade quando uma evidência de payload for
necessária. Retenção, acesso e mascaramento seguem a política de segurança do
produto.

## RabbitMQ

Cada bounded context define exchange, tipo (`topic` salvo decisão contrária),
routing keys, filas duráveis, DLX/DLQ, TTL, prefetch, retry e ownership no
contrato. O envelope deve conter `messageId`, `eventId`, `eventType`,
`eventVersion`, `occurredAt`, `producer`, `correlationId`, `causationId`,
`tenantId` e `schemaVersion`. Compatibilidade é aditiva por padrão; breaking
change exige nova versão, migração de consumidores e ADR.
