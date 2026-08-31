# Backend scaffold

Backend NestJS + Prisma/Postgres, operando com Event-Driven Architecture e
RabbitMQ. Este diretório é o runtime de Backend do monorepo Axiom Forge.

## Contratos entre repositórios

- Produto: `../product/` publica specs e a skill `spec-reader`; o Backend
  consome apenas uma ref aprovada do pacote.
- Frontend: `../frontend/` consome somente `docs/integration/<id>.md` com
  `status: APPROVED`.
- Regras de negócio: não existem neste template; adicione-as por specs aprovadas.

Consulte [cross-repo-reader](docs/engineering/cross-repo-reader.md),
[system-design](docs/engineering/system-design.md),
[EDA e RabbitMQ](docs/engineering/backend/event-driven-architecture.md) e o
[fontes de engenharia](docs/engineering/sources.md), além do
[modelo de integração](docs/integration/README.md).

## Desenvolvimento

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

Variáveis e serviços locais devem seguir `.env.example`. Nunca comite secrets
ou payloads de produção.
