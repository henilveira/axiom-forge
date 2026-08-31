# EDA com RabbitMQ — biblioteca operacional

Este documento é a referência de implementação do squad Backend. Ele combina
DDD, integração assíncrona e operação observável; não substitui a spec de
produto nem o contrato de integração.

## Decisões padrão

1. Evento de domínio é interno ao bounded context; evento de integração é
   público e versionado.
2. O outbox é a fronteira de confiabilidade entre Postgres e RabbitMQ.
3. Entrega é at-least-once; consumidores são idempotentes por `messageId` ou
   chave de negócio explicitamente definida.
4. Ack acontece após persistência/efeito bem-sucedido. Erro transitório usa
   retry; erro permanente vai para DLQ sem loop infinito.
5. O payload tem apenas dados necessários ao consumidor; segredos e PII são
   excluídos ou tokenizados conforme a política.

## Fluxo de publicação

```text
command → application → aggregate
                    ├→ state change
                    └→ outbox row (same transaction)
outbox relay → exchange → durable queue → consumer/inbox → handler → ack
```

O relay deve ser concorrente com claim seguro, lease/visibility timeout,
backoff e recuperação após restart. O consumidor deve tratar redelivery, ordem
duplicada, evento desconhecido, schema incompatível e shutdown gracioso.

## Envelope mínimo

```json
{
  "messageId": "uuid",
  "eventId": "uuid",
  "eventType": "bounded-context.resource.action.v1",
  "eventVersion": 1,
  "schemaVersion": 1,
  "occurredAt": "2026-08-27T00:00:00.000Z",
  "producer": "bounded-context",
  "correlationId": "uuid",
  "causationId": "uuid",
  "tenantId": "internal-id",
  "data": {}
}
```

O contrato real deve definir campos obrigatórios, semântica, cardinalidade,
compatibilidade, ownership, exemplos sanitizados e política de evolução.

## Logs obrigatórios por transição

O logger deve produzir um registro para `published`, `received`, `processed`,
`duplicate`, `retry_scheduled`, `rejected` e `dead_lettered`. Campos mínimos:

```text
eventId eventType eventVersion messageId correlationId causationId
producer consumer exchange routingKey tenantId attempt outcome durationMs
occurredAt recordedAt errorCode
```

`errorMessage` é sanitizada e limitada. Nunca serializar `data` integral.
Métricas e traces podem carregar os mesmos IDs, permitindo seguir uma mensagem
sem transformar logs em banco de dados de negócio.

## Checklist de cada evento

- [ ] nome, versão, owner e bounded context definidos;
- [ ] causa, efeito, invariantes e consumidor(es) documentados;
- [ ] outbox/inbox e idempotency key definidos;
- [ ] exchange, routing key, queue, DLX, DLQ, retry e prefetch definidos;
- [ ] log de cada transição com redaction testada;
- [ ] contrato, teste de compatibilidade e teste de redelivery;
- [ ] autorização, tenant isolation e limites de payload revisados;
- [ ] rollout, replay e rollback seguros.
