# Frontend scaffold

Frontend Next.js/React do Axiom Forge. O contrato Backend↔Frontend fica
versionado dentro deste monorepo.

## Contratos entre repositórios

- Backend: `../backend/` publica `docs/integration/<id>.md`; só `status:
  APPROVED` libera trabalho.
- Product: `../product/` é fonte indireta de contexto; o Frontend não lê a spec
  para inventar contratos.
- Produto: começa sem regras de negócio; o projeto derivado adiciona specs aprovadas.

Consulte [consumo cross-repo](docs/engineering/frontend-cross-repo-consumption.md),
[método](docs/engineering/frontend-method.md), as [fontes](docs/engineering/sources.md) e o
[guia de referências](docs/reference/README.md).

## Desenvolvimento

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

Para desenvolvimento local, copie `.env.example` para `.env.local` e mantenha
`AUTH_BACKEND_URL=http://localhost:8080`. Essa variável é consumida somente pelo servidor Next para
o rewrite same-origin `/auth/*`; não use prefixo `NEXT_PUBLIC_` e não coloque secrets nesse arquivo.
Em produção, a URL deve ser uma origem `https` sem credenciais, path, query ou fragmento; sem a
variável o proxy falha fechado.
