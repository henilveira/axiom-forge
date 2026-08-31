# Contratos de integração Backend → Frontend

O arquivo de integração identifica objetivo, escopo, rotas, request/response,
eventos, erros, autorização, observabilidade, rollout, rollback, testes e gaps.

Só pode ser consumido pelo Frontend quando tiver `status: APPROVED`,
`backend_commit`, `spec_id`, `updated_at` e `owner`. Uma integração em `DRAFT`
ou `IN_REVIEW` não libera implementação.

Use [o template](../engineering/_templates/integration-contract.template.md).

No ambiente local, o Backend escuta em `http://localhost:8080` e o Frontend em
`http://localhost:3000`. O proxy same-origin do Frontend encaminha `/auth/*`;
`AUTH_PUBLIC_BASE_URL` deve apontar para a origem pública do Frontend.
