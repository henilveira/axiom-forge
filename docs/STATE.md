---
name: project-state
description: Estado vivo e evidências do boilerplate Axiom Forge.
alwaysApply: false
---

# Estado do Axiom Forge

## BOILERPLATE-001 — scaffold inicial

- **Status:** boilerplate neutro publicado como repositório open source sob MIT.
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

## BOILERPLATE-003 — catálogo de stacks

- **Status:** catálogo compatível e gerador npm implementados no boilerplate.
- **Escopo:** frontend-only, backend-only ou full; stacks de frontend/backend,
  designs específicos, arquiteturas, bancos, brokers, providers e auth opcional.
- **Invariantes:** SDD, Gitflow, agents, segurança, Produto sem domínio e gates.
- **Infra:** Event-Driven exige broker; Compose gera somente banco/broker escolhidos.
- **Evidência:** testes do pacote, smoke projects, paridade, auditoria de docs,
  Mermaid e `docker compose config` passam.

## BOILERPLATE-004 — adapters multi-provider

- **Status:** implementado na branch de manutenção e aguardando revisão da PR.
- **Escopo:** seleção múltipla de providers e adapters nativos para Claude Code,
  Codex, GitHub Copilot, Cursor, Windsurf, Kimi Code, Google Antigravity,
  Gemini CLI, Cline, Roo Code, Kiro, Amazon Q Developer, Continue e OpenCode.
- **Decisão:** `SKILL.md` é a camada portátil; agentes, regras, modes e
  workflows usam o formato documentado por cada provider.
- **Evidência:** 10 testes do gerador, matriz de paths nativos, `pack:check`,
  paridade, auditoria da esteira, Mermaid e `git diff --check` passam.
- **Limitação:** não há ranking universal de adoção e o plugin Parallel Search
  não ficou executável nesta sessão; as fontes oficiais estão no report-source.
