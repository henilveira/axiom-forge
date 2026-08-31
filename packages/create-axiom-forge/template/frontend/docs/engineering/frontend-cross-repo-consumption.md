# Consumo cross-repo do Frontend

## Gate obrigatório

O tech lead deve receber:

```text
BACKEND_REPO=../backend
BACKEND_REF=<commit SHA ou tag imutável>
INTEGRATION_PATH=docs/integration/<integration-id>.md
VISUAL_REFERENCE_REPO=<referência visual read-only adicionada pelo projeto derivado, quando houver>
VISUAL_REFERENCE_REF=<commit SHA ou tag imutável, quando aplicável>
```

Leia o documento na ref fixada e aceite somente quando o campo YAML/metadata
for exatamente `status: APPROVED`. Exija `backend_commit`, `spec_id`,
`updated_at`, `owner`, rotas, request/response, erros, auth/tenant, eventos,
observabilidade, rollout/rollback e testes. Registre ambas as refs no plano do
Frontend.

Uma integração não aprovada bloqueia implementação. Mudança de contrato exige
novo documento/versionamento e nova aprovação; não faça inferência a partir de
controllers, código de uma referência visual ou comentários.

## Referência visual opcional

Leia apenas o inventário e os arquivos visuais necessários na ref da referência visual opcional.
Capture componente, tokens, tipografia, espaçamento, estados e evidência de
origem. Recrie o comportamento em componentes do Frontend atual, dentro das
normas de Next/React, acessibilidade e testes. Nunca importe a referência visual em
runtime, copie regra de negócio ou edite o repositório de referência.
