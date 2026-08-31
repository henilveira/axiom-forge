---
name: axiom-forge-home
description: Ponto de entrada do boilerplate SDD com Next.js e NestJS.
alwaysApply: false
---

# Axiom Forge

Boilerplate para iniciar projetos com Spec-Driven Development (SDD), Next.js e
NestJS. O template reúne uma biblioteca de Produto vazia, os agentes dos três
squads, um Frontend inicializado, um Backend com autenticação segura e
PostgreSQL/RabbitMQ prontos para desenvolvimento local.

## Estrutura

```text
product/    biblioteca vazia de Produto: discovery, PRDs, specs e agentes
frontend/   Next.js + React + Zod + fluxo de autenticação e proxy same-origin
backend/    NestJS + Prisma + PostgreSQL + RabbitMQ + autenticação
.agents/    roster técnico cross-squad e skills do orquestrador
.claude/    agentes Claude, regras e hooks compartilhados
docs/       arquitetura, método de engenharia, qualidade e estado
```

Os diretórios `product/`, `frontend/` e `backend/` também mantêm as instruções
e os agentes específicos de cada squad. Ao trabalhar a partir da raiz, o
`phase-orchestrator` coordena o DAG; ao trabalhar dentro de um squad, as
instruções locais daquele diretório continuam válidas.

## Quick start

Pré-requisitos: Node.js 22+, npm, Docker e Docker Compose.

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose -f backend/docker-compose.yml up -d

cd backend && npm ci && npx prisma migrate deploy && npm run start:dev
# em outro terminal
cd frontend && npm ci && npm run dev
```

Por padrão, o Backend escuta em `http://localhost:8080`, o Frontend em
`http://localhost:3000`, o Swagger em `/api/docs` e o proxy same-origin do
Frontend encaminha `/auth/*` para o Backend. Para executar os gates:

```bash
cd backend && npm run prisma:generate && npm run lint && npm run typecheck && npm run build && npm test
cd frontend && npm run lint && npm run typecheck && npm run build && npm test
python3 .agents/scripts/validate-agent-parity.py
```

## Criar um projeto derivado

Este repositório também publica o gerador `create-axiom-forge`, que transforma
este boilerplate em um novo projeto privado e sem regra de negócio:

```bash
npx create-axiom-forge meu-projeto
# ou: npm create axiom-forge -- meu-projeto
```

O comando pede quais agentes instalar (Claude, Codex ou ambos), deriva o
namespace do Docker, o banco Postgres e a topologia local do RabbitMQ a partir
do nome informado e deixa o projeto pronto para `/kickoff`.

## Segurança

- Nunca comite `.env`, tokens OAuth, chaves Resend, cookies ou dados de produção.
- Gere `AUTH_FINGERPRINT_SECRET` e `GOOGLE_OAUTH_TRANSACTION_SECRET` com pelo
  menos 32 caracteres aleatórios.
- Google OAuth vem desabilitado por padrão; e-mail local usa o provider em
  memória. Provider Resend e ambiente de produção exigem configuração explícita.
- A validação no browser é apenas UX. Sessão, CSRF, autenticação e autorização
  devem continuar sendo decididas no Backend.
- `backend/docker-compose.yml` é somente infraestrutura local descartável;
  revise volumes, domínios, TLS, e-mail e rate limit antes de produção.

## Fluxo SDD

Comece pela intenção natural. O orquestrador recupera `docs/STATE.md` e o DAG,
encaminha discovery/spec ao Product, modelagem e plano ao Tech Lead, executa as
lanes de Backend/Frontend/Testes e fecha com qualidade, segurança e release.
Specs só viram contrato de engenharia com status `APPROVED`.
