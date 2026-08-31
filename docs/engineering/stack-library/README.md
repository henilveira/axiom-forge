---
name: stack-library
description: Catálogo compatível de stacks, designs, arquiteturas, dados, brokers e providers do Axiom Forge.
alwaysApply: false
---

# Biblioteca de stacks do Axiom Forge

O Axiom Forge separa o que é método do que é runtime. O processo SDD, a
biblioteca de Produto vazia, o Gitflow, a segurança, os gates e a rastreabilidade
persistem. O gerador troca o habitat técnico: linguagem, framework, pastas,
convenções, banco, broker, provider e template opcional de autenticação.

## Catálogo inicial

| Eixo | Opções |
| --- | --- |
| Escopo | frontend + backend, somente frontend, somente backend |
| Frontend | Next.js, Vite + React, Vite + Vue, Angular, SvelteKit |
| Backend | NestJS, Express, FastAPI, Go + Gin, Spring Boot, ASP.NET Core |
| Arquitetura | monólito modular, monólito em camadas, microservices, Event-Driven, serverless |
| Banco | none, PostgreSQL, MySQL, MongoDB, SQLite |
| Broker | none, RabbitMQ, Kafka, NATS, Redis Streams |
| Provider | local + Docker Compose, AWS, Azure, GCP, Vercel, Cloudflare |

O catálogo executável vive em
packages/create-axiom-forge/bin/catalog.mjs. A opção --catalog imprime os ids
aceitos pelo CLI.

## Compatibilidade

Designs gerais podem aparecer em mais de uma stack, mas convenções próprias ficam
filtradas: Next App Router/RSC só aparece com Next.js; Vue Composition só com
Vue; Angular Standalone só com Angular; SvelteKit Runes só com SvelteKit; Go
standard layout só com Go; Spring Modulith só com Spring Boot; e ASP.NET Clean
só com ASP.NET Core.

Event-Driven exige um broker diferente de none. O gerador disponibiliza
RabbitMQ, Kafka, NATS ou Redis em Docker Compose. A topologia é de
desenvolvimento local; cada projeto deve registrar retries, idempotência,
particionamento, retenção, observabilidade e segurança em sua própria spec/ADR.

Vercel e Cloudflare são opções frontend-only nesta primeira versão. O provider
indica um alvo de implantação e não provisiona conta, credencial, domínio,
infraestrutura gerenciada ou secret.

## Autenticação opcional

axiom-foundation preserva a fundação técnica existente de autenticação e só é
oferecido no perfil completo Next.js + NestJS + PostgreSQL + RabbitMQ + local.
Qualquer outro perfil começa sem auth pronta e continua neutro. Isso evita
transportar uma implementação incompatível ou uma regra de negócio escondida.

## Agentes especialistas

O roster de processo continua fixo. A geração acrescenta somente os especialistas
do perfil selecionado:

- stack de frontend e backend;
- arquitetura;
- banco;
- broker;
- provider.

Codex recebe .agents/skills/<specialist>/SKILL.md; Claude recebe
.claude/agents/<specialist>.md. Os dois arquivos descrevem limites técnicos,
não autorizam o agente a inventar comportamento de produto.

## Fontes

As escolhas foram priorizadas por sinais de adoção e documentação oficial. O
relatório, as limitações da pesquisa e o ledger de claims estão em
[product/docs/engineering/report-source.md](../../../product/docs/engineering/report-source.md).
