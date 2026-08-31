# Estado do Backend

## TEMPLATE-001 — runtime inicial

- **Status:** scaffold técnico pronto.
- **Escopo:** NestJS, autenticação, Prisma/Postgres, RabbitMQ/EDA, testes e agentes locais.
- **Regra de negócio:** nenhuma; o domínio do projeto derivado começa vazio.
- **Próximo passo:** receber uma spec `APPROVED` e criar a primeira feature fora do módulo de autenticação.

## Gates

Toda mudança deve passar por lint, typecheck, build e testes aplicáveis. Integrações
reais de Postgres/RabbitMQ exigem os serviços do compose; mocks não contam como
prova de integração.
