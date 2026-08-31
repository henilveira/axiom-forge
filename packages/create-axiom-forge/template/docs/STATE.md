---
name: project-state
description: Estado vivo e evidências do boilerplate Axiom Forge.
alwaysApply: false
---

# Estado do Axiom Forge

## BOILERPLATE-001 — scaffold inicial

- **Status:** boilerplate neutro publicado como repositório privado.
- **Escopo:** biblioteca de Produto vazia, agentes cross-squad e locais, Frontend
  Next.js inicial, Backend NestJS com autenticação técnica, Prisma/Postgres e
  RabbitMQ via Docker Compose.
- **Fontes:** padrões de engenharia e runtime consolidados em um template novo;
  nenhum contexto, persona ou regra de negócio acompanha o repositório.
- **Segurança:** `.env` locais, dependências instaladas, builds e artefatos
  `generated` foram excluídos; apenas exemplos sem segredos foram publicados.
- **Próximo passo:** derivar o primeiro produto preenchendo `product/` com uma
  spec aprovada.

## Evidências de origem

- Frontend: lint, typecheck, testes e build passam com
  `AUTH_BACKEND_URL` e `AUTH_PUBLIC_ORIGIN` de produção configurados.
- Backend: lint, typecheck, build, unit e contract passam; integração real
  depende do Postgres/RabbitMQ.
- Paridade cross-squad: 13 roles Codex ↔ Claude aprovada no snapshot.

## Notas de reutilização

O template não contém contexto de negócio. Ao derivar um produto, preencha
somente a biblioteca `product/`, substitua o remetente/domínios da autenticação
e configure os secrets no ambiente de execução.
