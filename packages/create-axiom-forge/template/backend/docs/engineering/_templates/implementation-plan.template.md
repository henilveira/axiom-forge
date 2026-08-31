# Plano de implementação — <spec-id>

- **Spec:** `<spec-id>` `<version>`
- **Product ref:** `<commit SHA/tag>`
- **Status:** `DRAFT | READY | IN_PROGRESS | BLOCKED | COMPLETE`
- **Tech lead:** `<nome>`
- **Data:** `<YYYY-MM-DD>`

## Rastreabilidade

| Requisito/BR | Decisão técnica | Owner | Evidência/teste |
|---|---|---|---|
| `<REQ/BR>` | `<design>` | `<agent>` | `<test/doc>` |

## Decomposição por agente

### Domain modeler

- Agregado/invariantes:
- Eventos de domínio:
- `OPEN-REQ`:

### Backend data engineer

- Prisma/migration não destrutiva:
- Outbox/inbox/concorrência:
- RabbitMQ topology:

### Backend engineer

- Use cases/ports:
- Controllers/consumers/DTOs:
- Logs e métricas:

### Test engineer

- Unit/integration/contract/E2E:
- Redelivery, idempotência e DLQ:

### Quality/security/release

- Gates, tenant isolation, autorização e rollback:

## Riscos e decisões

| Risco | Mitigação | Owner | Estado |
|---|---|---|---|
| `<risco>` | `<mitigação>` | `<owner>` | `<status>` |
