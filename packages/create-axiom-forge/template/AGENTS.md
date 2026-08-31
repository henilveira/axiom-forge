# Axiom Forge — contrato de trabalho do Codex

Este é um boilerplate monorepo para Spec-Driven Development. A sessão principal
coordena o fluxo pelo `phase-orchestrator`; writers de produto/runtime trabalham
em worktrees próprias e a sessão não mascara gates vermelhos.

## Contexto mínimo

Leia, nesta ordem, `docs/STATE.md`,
`docs/engineering/state/active-delegation.yaml`, `product/docs/product/README.md`,
`product/docs/glossary.md`,
a spec ligada à task e o método da camada. Confronte sempre com branch,
worktrees, diff e testes; o STATE/YAML não substitui o Git real.

## Onde cada coisa mora

- `product/` — biblioteca de Produto vazia, discovery, PRDs, jornadas, personas e specs.
- `frontend/` — Next.js/React feature-based, contratos Zod, composição e UI.
- `backend/` — NestJS/Prisma/Postgres, EDA/RabbitMQ, autenticação e HTTP.
- `docs/engineering/` — arquitetura operacional, qualidade, segurança e processo.
- `docs/architecture/` — decisões duráveis do template.
- `.agents/` e `.claude/` — camada cross-squad; cada squad mantém também seu
  roster local para uso quando o diretório dele for a raiz de trabalho.

Nenhum domínio de negócio acompanha este template. Se um projeto derivado
precisar de referências externas, adicione-as como fontes read-only e fixe o commit.

## Fonte da verdade e idioma

Produto e documentos usam português; identificadores em código usam inglês e o
glossário em `product/docs/glossary.md`. O template não define produto, personas,
pricing, tenancy ou outras regras de negócio. Só implemente comportamento de um
projeto derivado com spec `APPROVED`/`approved`. Ambiguidade que muda produto
vira `OPEN-REQ`; divergência consciente vira `SPEC_DEVIATION`; decisão difícil
de reverter vira ADR.

## Arquitetura não negociável

Backend: `interfaces → application → domain ← infrastructure`; domínio não
importa framework, I/O, Prisma, SDK, logger ou relógio global. Frontend:
`schemas → types → services → queries/mutations → forms/orchestration →
components/ui`; Zod valida qualquer `unknown` e UI não busca dados.

## Delegação

O roster técnico cross-squad é: `phase-orchestrator`, `spec-engineer`,
`domain-modeler`, `tech-lead`, `backend-data-engineer`, `backend-engineer`,
`frontend-engineer`, `frontend-ui-engineer`, `test-engineer`,
`quality-engineer`, `security-reviewer`, `release-engineer` e
`git-flow-specialist`. Os rosters locais de Product e Frontend adicionam os
papéis especializados desses squads.

Fluxo padrão: `SPEC → spec → domain → tech-lead → lanes → testes →
quality/security → release → Git`. Nenhum agente deve inventar regra,
adicionar dependência sem aprovação, registrar segredo ou usar cast/any para
esconder contrato.

## Continuidade e gates

O plano vivo fica em `docs/STATE.md` e
`docs/engineering/state/active-delegation.yaml`. Ao pausar, registre status,
dependências, checkpoint, branch/worktree, último gate, bloqueio e próximo
passo. Antes de publicar, rode paridade de agentes, lint, typecheck, build e
testes aplicáveis dos dois apps; integrações reais de Postgres/RabbitMQ exigem
os serviços do compose e não são substituídas por mocks.
