# Integração — <integration-id>

- **Nome:** `<nome identificável>`
- **Backend module:** `<module>`
- **Spec:** `<spec-id>` `<version>`
- **Status:** `DRAFT | IN_REVIEW | APPROVED | DEPRECATED`
- **Data de atualização:** `<YYYY-MM-DD>`
- **Backend commit:** `<SHA>`
- **Owner:** `<nome>`

## Objetivo e escopo

<objetivo, escopo atual, fora de escopo e dependências.>

## Semântica

<conceitos, estados, transições, regras e permissões.>

## Rotas públicas

| Método | Rota | Auth/tenant | Request | Response | Erros |
|---|---|---|---|---|---|
| `<GET>` | `</resource>` | `<policy>` | `<contract>` | `<contract>` | `<codes>` |

## Eventos RabbitMQ

| Tipo/versão | Exchange | Routing key | Queue/consumer | Payload sanitizado | Retry/DLQ |
|---|---|---|---|---|---|
| `<event.v1>` | `<exchange>` | `<key>` | `<queue>` | `<schema>` | `<policy>` |

## Observabilidade

<event IDs, correlation, logs obrigatórios, métricas, traces e redaction.>

## Rollout, rollback e testes

<flags, compatibilidade, migração, rollback, testes e gaps conhecidos.>

## Changelog

| Data | Autor | Mudança |
|---|---|---|
| `<YYYY-MM-DD>` | `<nome>` | `<mudança>` |
